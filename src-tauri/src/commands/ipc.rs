use crate::error::AppResult;
use crate::models::{Comment, Person, Project, Todo};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub fn get_or_create_me(
    st: State<'_, AppState>,
    name: String,
    avatar_path: Option<String>,
) -> AppResult<Person> {
    super::me::get_or_create_me(&st, name, avatar_path)
}

#[tauri::command]
pub fn set_my_avatar(
    st: State<'_, AppState>,
    avatar_path: Option<String>,
) -> AppResult<()> {
    super::me::set_my_avatar(&st, avatar_path)
}

#[tauri::command]
pub fn list_people(st: State<'_, AppState>) -> AppResult<Vec<Person>> {
    super::people::list(&st)
}

#[tauri::command]
pub fn upsert_person(
    st: State<'_, AppState>,
    name: String,
    avatar_path: Option<String>,
) -> AppResult<Person> {
    super::people::upsert(&st, name, avatar_path)
}

#[tauri::command]
pub fn list_projects(
    st: State<'_, AppState>,
    include_archived: bool,
) -> AppResult<Vec<Project>> {
    super::projects::list(&st, include_archived)
}

#[tauri::command]
pub fn create_project(
    st: State<'_, AppState>,
    name: String,
    color: String,
) -> AppResult<Project> {
    super::projects::create(&st, name, color)
}

#[tauri::command]
pub fn update_project(
    st: State<'_, AppState>,
    id: i64,
    name: Option<String>,
    color: Option<String>,
    archived: Option<bool>,
) -> AppResult<Project> {
    super::projects::update(&st, id, name, color, archived)
}

#[tauri::command]
pub fn list_todos(st: State<'_, AppState>) -> AppResult<Vec<Todo>> {
    super::todos::list_all(&st)
}

#[tauri::command]
pub fn list_todos_for_person(
    st: State<'_, AppState>,
    person_id: i64,
) -> AppResult<Vec<Todo>> {
    super::todos::list_for_person(&st, person_id)
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub fn create_todo(
    st: State<'_, AppState>,
    title: String,
    description: Option<String>,
    priority: i32,
    due_date: Option<String>,
    tags: Option<String>,
    project_id: i64,
    from_person_id: i64,
    to_person_id: i64,
) -> AppResult<Todo> {
    super::todos::create(
        &st, title, description, priority, due_date, tags,
        project_id, from_person_id, to_person_id,
    )
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub fn update_todo(
    st: State<'_, AppState>,
    id: i64,
    title: Option<String>,
    description: Option<String>,
    status: Option<String>,
    priority: Option<i32>,
    project_id: Option<i64>,
    from_person_id: Option<i64>,
    to_person_id: Option<i64>,
) -> AppResult<Todo> {
    super::todos::update(
        &st, id, title, description, status, priority,
        None, None, project_id, from_person_id, to_person_id,
    )
}

#[tauri::command]
pub fn set_todo_status(
    st: State<'_, AppState>,
    id: i64,
    status: String,
) -> AppResult<Todo> {
    super::todos::set_status(&st, id, status)
}

#[tauri::command]
pub fn delete_todo(st: State<'_, AppState>, id: i64) -> AppResult<()> {
    super::todos::delete(&st, id)
}

#[tauri::command]
pub fn add_comment(
    st: State<'_, AppState>,
    todo_id: i64,
    author_id: i64,
    body: String,
) -> AppResult<Comment> {
    super::comments::add(&st, todo_id, author_id, body)
}

#[tauri::command]
pub fn list_comments(
    st: State<'_, AppState>,
    todo_id: i64,
) -> AppResult<Vec<Comment>> {
    super::comments::list(&st, todo_id)
}

#[tauri::command]
pub fn delete_comment(st: State<'_, AppState>, id: i64) -> AppResult<()> {
    super::comments::delete(&st, id)
}

#[tauri::command]
pub fn export_json(st: State<'_, AppState>) -> AppResult<String> {
    super::export::export_json(&st)
}

#[tauri::command]
pub fn import_json(
    st: State<'_, AppState>,
    json: String,
    merge: bool,
) -> AppResult<()> {
    super::export::import_json(&st, &json, merge)
}
