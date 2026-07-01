use crate::error::{AppError, AppResult};
use crate::models::Todo;
use crate::state::AppState;
use rusqlite::params;

const VALID_STATUSES: &[&str] = &["pending", "in_progress", "done", "blocked"];

fn row_to_todo(r: &rusqlite::Row) -> rusqlite::Result<Todo> {
    Ok(Todo {
        id: r.get(0)?,
        title: r.get(1)?,
        description: r.get(2)?,
        status: r.get(3)?,
        priority: r.get(4)?,
        due_date: r.get(5)?,
        tags: r.get(6)?,
        project_id: r.get(7)?,
        from_person_id: r.get(8)?,
        to_person_id: r.get(9)?,
        created_at: r.get(10)?,
        updated_at: r.get(11)?,
    })
}

fn select_sql(where_clause: &str) -> String {
    format!(
        "SELECT id, title, description, status, priority, due_date, tags, project_id, from_person_id, to_person_id, created_at, updated_at FROM todos {} ORDER BY created_at DESC",
        where_clause
    )
}

fn query_one(conn: &rusqlite::Connection, id: i64) -> AppResult<Todo> {
    Ok(conn.query_row(&select_sql("WHERE id = ?1"), params![id], row_to_todo)?)
}

pub fn list_all(st: &AppState) -> AppResult<Vec<Todo>> {
    let conn = st.conn.lock().unwrap();
    let mut stmt = conn.prepare(&select_sql(""))?;
    let rows = stmt.query_map([], row_to_todo)?;
    Ok(rows.filter_map(|x| x.ok()).collect())
}

pub fn list_for_person(st: &AppState, person_id: i64) -> AppResult<Vec<Todo>> {
    let conn = st.conn.lock().unwrap();
    let mut stmt = conn.prepare(&select_sql("WHERE from_person_id = ?1 OR to_person_id = ?1"))?;
    let rows = stmt.query_map(params![person_id], row_to_todo)?;
    Ok(rows.filter_map(|x| x.ok()).collect())
}

pub fn get(st: &AppState, id: i64) -> AppResult<Todo> {
    let conn = st.conn.lock().unwrap();
    query_one(&conn, id)
}

#[allow(clippy::too_many_arguments)]
pub fn create(
    st: &AppState,
    title: String,
    description: Option<String>,
    priority: i32,
    due_date: Option<String>,
    tags: Option<String>,
    project_id: i64,
    from_person_id: i64,
    to_person_id: i64,
) -> AppResult<Todo> {
    if title.trim().is_empty() {
        return Err(AppError::Invalid("title required".into()));
    }
    if from_person_id == to_person_id {
        return Err(AppError::Invalid("cannot delegate to self".into()));
    }
    let conn = st.conn.lock().unwrap();
    let now = super::me::now_iso();
    conn.execute(
        "INSERT INTO todos (title, description, status, priority, due_date, tags, project_id, from_person_id, to_person_id, created_at, updated_at) VALUES (?1, ?2, 'pending', ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)",
        params![title, description, priority, due_date, tags, project_id, from_person_id, to_person_id, now],
    )?;
    let id = conn.last_insert_rowid();
    // Reuse the same connection while the lock is held; calling get(st, id) here would re-lock std::sync::Mutex from the same thread, which deadlocks on Windows.
    query_one(&conn, id)
}

#[allow(clippy::too_many_arguments)]
pub fn update(
    st: &AppState,
    id: i64,
    title: Option<String>,
    description: Option<String>,
    status: Option<String>,
    priority: Option<i32>,
    due_date: Option<Option<String>>,
    tags: Option<Option<String>>,
    project_id: Option<i64>,
    from_person_id: Option<i64>,
    to_person_id: Option<i64>,
) -> AppResult<Todo> {
    if let (Some(f), Some(t)) = (from_person_id, to_person_id) {
        if f == t { return Err(AppError::Invalid("cannot delegate to self".into())); }
    }
    if let Some(s) = &status {
        if !VALID_STATUSES.contains(&s.as_str()) {
            return Err(AppError::Invalid(format!("invalid status: {}", s)));
        }
    }
    let conn = st.conn.lock().unwrap();
    let now = super::me::now_iso();
    if let Some(d) = due_date {
        conn.execute("UPDATE todos SET due_date = ?1 WHERE id = ?2", params![d, id])?;
    }
    if let Some(t) = tags {
        conn.execute("UPDATE todos SET tags = ?1 WHERE id = ?2", params![t, id])?;
    }
    let n = conn.execute(
        "UPDATE todos SET title = COALESCE(?1, title), description = COALESCE(?2, description), status = COALESCE(?3, status), priority = COALESCE(?4, priority), project_id = COALESCE(?5, project_id), from_person_id = COALESCE(?6, from_person_id), to_person_id = COALESCE(?7, to_person_id), updated_at = ?8 WHERE id = ?9",
        params![title, description, status, priority, project_id, from_person_id, to_person_id, now, id],
    )?;
    if n == 0 { return Err(AppError::NotFound(format!("todo {}", id))); }
    // Same as create: query while holding the lock.
    query_one(&conn, id)
}

pub fn set_status(st: &AppState, id: i64, status: String) -> AppResult<Todo> {
    update(st, id, None, None, Some(status), None, None, None, None, None, None)
}

pub fn delete(st: &AppState, id: i64) -> AppResult<()> {
    let conn = st.conn.lock().unwrap();
    let n = conn.execute("DELETE FROM todos WHERE id = ?1", params![id])?;
    if n == 0 { return Err(AppError::NotFound(format!("todo {}", id))); }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;

    fn make_test_path(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join("todomap-tests");
        let _ = fs::create_dir_all(&dir);
        dir.join(format!("{}-{}.sqlite", name, std::process::id()))
    }

    fn setup() -> (AppState, i64, i64) {
        let path = make_test_path("todos-unit");
        let _ = fs::remove_file(&path);
        let st = AppState::open_test(&path).unwrap();
        let _me = crate::commands::me::get_or_create_me(&st, "M".into(), None).unwrap();
        let other = crate::commands::people::upsert(&st, "O".into(), None).unwrap();
        let proj = crate::commands::projects::create(&st, "P".into(), "#3aa856".into()).unwrap();
        (st, other.id, proj.id)
    }

    #[test]
    fn create_basic() {
        let (st, other_id, proj_id) = setup();
        let t = create(&st, "T".into(), None, 1, Some("2026-08-01".into()), None, proj_id, 1, other_id).unwrap();
        assert_eq!(t.status, "pending");
        assert_eq!(t.title, "T");
        assert_eq!(t.due_date.as_deref(), Some("2026-08-01"));
        assert_eq!(t.from_person_id, 1);
        assert_eq!(t.to_person_id, other_id);
        let fetched = get(&st, t.id).unwrap();
        assert_eq!(fetched.id, t.id);
        let _ = fs::remove_file(&make_test_path("todos-unit"));
    }

    #[test]
    fn set_status_done() {
        let (st, other_id, proj_id) = setup();
        let t = create(&st, "x".into(), None, 0, None, None, proj_id, 1, other_id).unwrap();
        let t2 = set_status(&st, t.id, "done".into()).unwrap();
        assert_eq!(t2.status, "done");
        assert_eq!(t2.id, t.id);
        let _ = fs::remove_file(&make_test_path("todos-unit"));
    }

    #[test]
    fn list_for_person_returns_both_directions() {
        let (st, other_id, proj_id) = setup();
        let _t1 = create(&st, "out".into(), None, 0, None, None, proj_id, 1, other_id).unwrap();
        let _t2 = create(&st, "in".into(), None, 0, None, None, proj_id, other_id, 1).unwrap();
        let from_me = list_for_person(&st, 1).unwrap();
        let to_other = list_for_person(&st, other_id).unwrap();
        assert_eq!(from_me.len(), 2);
        assert_eq!(to_other.len(), 2);
        let _ = fs::remove_file(&make_test_path("todos-unit"));
    }

    #[test]
    fn cannot_self_delegate() {
        let (st, _other_id, proj_id) = setup();
        let err = create(&st, "x".into(), None, 0, None, None, proj_id, 1, 1);
        assert!(err.is_err());
        let _ = fs::remove_file(&make_test_path("todos-unit"));
    }
}
