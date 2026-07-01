pub mod commands;
pub mod db;
pub mod error;
pub mod models;
pub mod state;

use commands::ipc;
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
        .invoke_handler(tauri::generate_handler![
            ipc::get_or_create_me,
            ipc::set_my_avatar,
            ipc::list_people,
            ipc::upsert_person,
            ipc::update_person,
            ipc::list_projects,
            ipc::create_project,
            ipc::update_project,
            ipc::list_todos,
            ipc::list_todos_for_person,
            ipc::create_todo,
            ipc::update_todo,
            ipc::set_todo_status,
            ipc::delete_todo,
            ipc::add_comment,
            ipc::list_comments,
            ipc::delete_comment,
            ipc::export_json,
            ipc::import_json,
        ])
        .run(tauri::generate_context!())
        .expect("error while running todoMap");
}
