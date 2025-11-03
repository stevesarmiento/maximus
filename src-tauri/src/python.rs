use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentMessage {
    pub message_type: String,
    pub content: String,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatusUpdate {
    pub phase: String,
    pub message: String,
    pub details: Option<String>,
}

pub struct PythonAgent {
    process: Arc<Mutex<Option<Child>>>,
    app_handle: Option<AppHandle>,
}

impl PythonAgent {
    pub fn new() -> Self {
        Self {
            process: Arc::new(Mutex::new(None)),
            app_handle: None,
        }
    }

    pub fn set_app_handle(&mut self, handle: AppHandle) {
        self.app_handle = Some(handle);
    }

    /// Start the Python agent process
    pub fn start(&self) -> Result<()> {
        let mut process_lock = self.process.lock().unwrap();

        // Check if process is already running
        if let Some(ref mut child) = *process_lock {
            if let Ok(None) = child.try_wait() {
                // Process is still running
                return Ok(());
            }
        }

        // Determine Python command and maximus module path
        // In development: use system Python with uv
        // In production: use bundled Python runtime
        let python_cmd = if cfg!(debug_assertions) {
            // Development mode: use uv to run maximus
            "uv"
        } else {
            // Production mode: use bundled Python
            // TODO: Update this path when bundling is implemented
            "python3"
        };

        let args: Vec<&str> = if cfg!(debug_assertions) {
            vec!["run", "maximus", "--json"]
        } else {
            vec!["-m", "maximus", "--json"]
        };

        println!("Starting Python agent with: {} {:?}", python_cmd, args);

        // Build command with environment variables
        let mut command = Command::new(python_cmd);
        command
            .args(&args)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        
        // Pass DELEGATION_ENCRYPTION_KEY if it exists in the environment
        if let Ok(key) = std::env::var("DELEGATION_ENCRYPTION_KEY") {
            command.env("DELEGATION_ENCRYPTION_KEY", key);
            println!("Passing DELEGATION_ENCRYPTION_KEY to Python agent");
        } else {
            println!("Warning: DELEGATION_ENCRYPTION_KEY not found in environment");
        }
        
        let child = command
            .spawn()
            .context("Failed to spawn Python agent process")?;

        *process_lock = Some(child);
        println!("Python agent started successfully");
        Ok(())
    }

    /// Send a query to the Python agent
    pub fn send_query(&self, query: &str) -> Result<String> {
        let mut process_lock = self.process.lock().unwrap();

        if let Some(ref mut child) = *process_lock {
            // Send query via stdin
            if let Some(ref mut stdin) = child.stdin {
                writeln!(stdin, "{}", query)
                    .context("Failed to write query to Python agent")?;
                stdin.flush().context("Failed to flush stdin")?;
            }
            
            // Clone app handle before reading to avoid holding lock during emit
            let app_handle = self.app_handle.clone();
            
            // Read JSON response from stdout
            if let Some(ref mut stdout) = child.stdout {
                let reader = BufReader::new(stdout);
                
                // Read lines and parse JSON responses
                for line in reader.lines() {
                    if let Ok(line) = line {
                        println!("Python output: {}", line); // Debug
                        
                        // Try to parse as JSON
                        if let Ok(json_response) = serde_json::from_str::<serde_json::Value>(&line) {
                            // Extract response based on type
                            if let Some(response_type) = json_response["type"].as_str() {
                                match response_type {
                                    "status" => {
                                        // Emit status update event to frontend
                                        if let Some(ref app) = app_handle {
                                            let status_data = StatusUpdate {
                                                phase: json_response["phase"].as_str().unwrap_or("idle").to_string(),
                                                message: json_response["message"].as_str().unwrap_or("").to_string(),
                                                details: json_response["details"].as_str().map(|s| s.to_string()),
                                            };
                                            println!("Emitting status: {:?}", status_data); // Debug
                                            let _ = app.emit_to("main", "status-update", &status_data);
                                        }
                                        // Continue reading for actual response
                                        continue;
                                    }
                                    "answer" => {
                                        if let Some(answer) = json_response["answer"].as_str() {
                                            return Ok(answer.to_string());
                                        }
                                    }
                                    "command_result" => {
                                        if let Some(result) = json_response["result"].as_str() {
                                            return Ok(result.to_string());
                                        }
                                    }
                                    "command" => {
                                        if let Some(message) = json_response["message"].as_str() {
                                            return Ok(message.to_string());
                                        }
                                    }
                                    "error" => {
                                        if let Some(error) = json_response["error"].as_str() {
                                            return Err(anyhow::anyhow!("Agent error: {}", error));
                                        }
                                    }
                                    "ready" => {
                                        println!("Agent ready"); // Debug
                                        // Agent is ready, continue reading
                                        continue;
                                    }
                                    "delegation_activated" => {
                                        // Delegation was activated from temp file
                                        if let Some(ref app) = app_handle {
                                            let _ = app.emit_to("main", "delegation-activated", &json_response);
                                        }
                                        println!("Delegation activated"); // Debug
                                        continue;
                                    }
                                    "delegation_error" => {
                                        // Error processing delegation
                                        if let Some(ref app) = app_handle {
                                            let _ = app.emit_to("main", "delegation-error", &json_response);
                                        }
                                        println!("Delegation error: {:?}", json_response.get("error")); // Debug
                                        continue;
                                    }
                                    _ => {
                                        println!("Unknown type: {}", response_type); // Debug
                                        continue;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        Err(anyhow::anyhow!("Python agent process not running or no response received"))
    }

    /// Stop the Python agent process
    pub fn stop(&self) -> Result<()> {
        let mut process_lock = self.process.lock().unwrap();

        if let Some(ref mut child) = *process_lock {
            child.kill().context("Failed to kill Python agent process")?;
            child.wait().context("Failed to wait for process exit")?;
            *process_lock = None;
            println!("Python agent stopped");
        }

        Ok(())
    }

    /// Check if the agent is running
    pub fn is_running(&self) -> bool {
        let process_lock = self.process.lock().unwrap();
        if let Some(ref _child) = *process_lock {
            // Try to get process status without blocking
            true // Simplified for now
        } else {
            false
        }
    }
}

impl Drop for PythonAgent {
    fn drop(&mut self) {
        let _ = self.stop();
    }
}

pub type PythonAgentState = Arc<Mutex<PythonAgent>>;

pub fn init_python_agent() -> PythonAgentState {
    Arc::new(Mutex::new(PythonAgent::new()))
}

