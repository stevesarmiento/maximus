// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod cache;
mod commands;
mod python;

use python::init_python_agent;
use tauri::Manager;

fn main() {
    // Load environment variables from .env file
    // Look for .env in the workspace root (parent of src-tauri)
    let env_path = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .join(".env");
    
    if env_path.exists() {
        match dotenvy::from_path(&env_path) {
            Ok(_) => println!("Loaded environment variables from {:?}", env_path),
            Err(e) => eprintln!("Warning: Failed to load .env file: {}", e),
        }
    } else {
        eprintln!("Warning: No .env file found at {:?}", env_path);
    }
    
    // Initialize the Python agent state
    let python_agent = init_python_agent();

    tauri::Builder::default()
        .manage(python_agent.clone())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::send_query,
            commands::get_agent_status,
            commands::start_agent,
            commands::stop_agent,
            commands::clear_memory,
            commands::get_wallet_balances,
            commands::get_transactions,
            commands::open_wallet_manager,
            commands::clear_cache,
            commands::get_cache_stats,
            commands::check_api_status,
        ])
        .setup(|app| {
            // Set app handle in the agent for event emission
            let agent_state = app.state::<std::sync::Arc<std::sync::Mutex<python::PythonAgent>>>();
            let mut agent = agent_state.lock().unwrap();
            agent.set_app_handle(app.handle().clone());
            
            // Start the Python agent on app startup
            if let Err(e) = agent.start() {
                eprintln!("Warning: Failed to start Python agent on startup: {}", e);
                eprintln!("Agent will be started when first query is sent.");
            } else {
                println!("Python agent started successfully on app startup");
            }
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
