pub mod commands;
pub mod db;
pub mod error;
pub mod models;
pub mod state;

use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let dir = app.path().app_data_dir().expect("no app data dir");
            let st = AppState::open(dir).map_err(|e| e.to_string())?;
            app.manage(st);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running todoMap");
}