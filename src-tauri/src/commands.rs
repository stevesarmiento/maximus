use crate::cache::{query_cache_key, QUERY_CACHE};
use crate::python::PythonAgentState;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryResponse {
    pub success: bool,
    pub response: String,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AgentStatus {
    pub running: bool,
    pub connected: bool,
}

/// Send a query to the Python agent
#[tauri::command]
pub async fn send_query(
    query: String,
    agent_state: State<'_, PythonAgentState>,
    use_cache: Option<bool>,
) -> Result<QueryResponse, String> {
    println!("Received query: {}", query);

    let use_cache = use_cache.unwrap_or(true);
    
    // Check cache for non-command queries
    if use_cache && !query.starts_with('/') {
        let cache_key = query_cache_key(&query);
        if let Some(cached_response) = QUERY_CACHE.get(&cache_key) {
            println!("Cache hit for query: {}", query);
            return Ok(QueryResponse {
                success: true,
                response: cached_response,
                error: None,
            });
        }
    }

    let agent = agent_state.lock().map_err(|e| e.to_string())?;

    // Ensure agent is running
    if !agent.is_running() {
        agent.start().map_err(|e| format!("Failed to start agent: {}", e))?;
    }

    // Send query and get response
    match agent.send_query(&query) {
        Ok(response) => {
            // Cache successful responses for non-command queries
            if use_cache && !query.starts_with('/') {
                let cache_key = query_cache_key(&query);
                QUERY_CACHE.set(cache_key, response.clone());
            }
            
            Ok(QueryResponse {
                success: true,
                response,
                error: None,
            })
        }
        Err(e) => Ok(QueryResponse {
            success: false,
            response: String::new(),
            error: Some(e.to_string()),
        }),
    }
}

/// Get the status of the Python agent
#[tauri::command]
pub async fn get_agent_status(
    agent_state: State<'_, PythonAgentState>,
) -> Result<AgentStatus, String> {
    let agent = agent_state.lock().map_err(|e| e.to_string())?;

    Ok(AgentStatus {
        running: agent.is_running(),
        connected: agent.is_running(),
    })
}

/// Start the Python agent
#[tauri::command]
pub async fn start_agent(agent_state: State<'_, PythonAgentState>) -> Result<(), String> {
    let agent = agent_state.lock().map_err(|e| e.to_string())?;
    agent.start().map_err(|e| format!("Failed to start agent: {}", e))
}

/// Stop the Python agent
#[tauri::command]
pub async fn stop_agent(agent_state: State<'_, PythonAgentState>) -> Result<(), String> {
    let agent = agent_state.lock().map_err(|e| e.to_string())?;
    agent.stop().map_err(|e| format!("Failed to stop agent: {}", e))
}

/// Clear agent memory
#[tauri::command]
pub async fn clear_memory(agent_state: State<'_, PythonAgentState>) -> Result<(), String> {
    // Send the /clear command to the agent
    let agent = agent_state.lock().map_err(|e| e.to_string())?;
    
    if agent.is_running() {
        agent.send_query("/clear")
            .map_err(|e| format!("Failed to clear memory: {}", e))?;
    }
    
    Ok(())
}

/// Get wallet balances via the agent
#[tauri::command]
pub async fn get_wallet_balances(
    agent_state: State<'_, PythonAgentState>,
) -> Result<QueryResponse, String> {
    send_query("/balances".to_string(), agent_state, Some(false)).await
}

/// Get transaction history via the agent
#[tauri::command]
pub async fn get_transactions(
    agent_state: State<'_, PythonAgentState>,
) -> Result<QueryResponse, String> {
    send_query("/transactions".to_string(), agent_state, Some(false)).await
}

/// Open the web wallet manager in browser
#[tauri::command]
pub async fn open_wallet_manager() -> Result<(), String> {
    // Open the Next.js dashboard in the default browser
    let url = "http://localhost:3000";
    
    if let Err(e) = webbrowser::open(url) {
        return Err(format!("Failed to open wallet manager: {}", e));
    }
    
    Ok(())
}

/// Clear the query cache
#[tauri::command]
pub async fn clear_cache() -> Result<(), String> {
    QUERY_CACHE.clear();
    println!("Cache cleared");
    Ok(())
}

/// Get cache statistics
#[tauri::command]
pub async fn get_cache_stats() -> Result<String, String> {
    // Trigger cleanup
    QUERY_CACHE.cleanup();
    
    // In a real implementation, we'd return actual stats
    // For now, just confirm cache is working
    Ok("Cache is operational".to_string())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiStatusResponse {
    pub intelligence: bool,
    pub memory: bool,
    pub market_data: bool,
    pub websocket: bool,
    pub token_swapping: bool,
}

/// Check API status based on environment variables
#[tauri::command]
pub async fn check_api_status() -> Result<ApiStatusResponse, String> {
    use std::env;
    
    let openai_key = env::var("OPENAI_API_KEY").is_ok();
    let coingecko_key = env::var("COINGECKO_API_KEY").is_ok();
    let titan_key = env::var("TITAN_API_TOKEN").is_ok();
    let realtime_enabled = env::var("REALTIME_PRICE_ENABLED")
        .unwrap_or_else(|_| "true".to_string())
        .to_lowercase() == "true";
    
    Ok(ApiStatusResponse {
        intelligence: openai_key,
        memory: openai_key,
        market_data: coingecko_key,
        websocket: coingecko_key && realtime_enabled,
        token_swapping: titan_key,
    })
}

