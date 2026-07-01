use crate::error::{AppError, AppResult};
use crate::models::Project;
use crate::state::AppState;
use rusqlite::params;

pub fn list(st: &AppState, include_archived: bool) -> AppResult<Vec<Project>> {
    let conn = st.conn.lock().unwrap();
    let sql = if include_archived {
        "SELECT id, name, color, archived, created_at FROM projects ORDER BY name ASC"
    } else {
        "SELECT id, name, color, archived, created_at FROM projects WHERE archived = 0 ORDER BY name ASC"
    };
    let mut stmt = conn.prepare(sql)?;
    let rows = stmt.query_map([], |r| Ok(Project {
        id: r.get(0)?,
        name: r.get(1)?,
        color: r.get(2)?,
        archived: r.get::<_, i64>(3)? != 0,
        created_at: r.get(4)?,
    }))?;
    Ok(rows.filter_map(|x| x.ok()).collect())
}

pub fn create(st: &AppState, name: String, color: String) -> AppResult<Project> {
    if name.trim().is_empty() {
        return Err(AppError::Invalid("project name required".into()));
    }
    if !color.starts_with('#') || color.len() != 7 {
        return Err(AppError::Invalid("color must be #RRGGBB".into()));
    }
    let conn = st.conn.lock().unwrap();
    let now = super::me::now_iso();
    conn.execute(
        "INSERT INTO projects (name, color, archived, created_at) VALUES (?1, ?2, 0, ?3)",
        params![name, color, now],
    )?;
    let id = conn.last_insert_rowid();
    Ok(Project { id, name, color, archived: false, created_at: now })
}

pub fn update(
    st: &AppState,
    id: i64,
    name: Option<String>,
    color: Option<String>,
    archived: Option<bool>,
) -> AppResult<Project> {
    let conn = st.conn.lock().unwrap();
    if let Some(c) = &color {
        if !c.starts_with('#') || c.len() != 7 {
            return Err(AppError::Invalid("color must be #RRGGBB".into()));
        }
    }
    let n = conn.execute(
        "UPDATE projects SET
            name = COALESCE(?1, name),
            color = COALESCE(?2, color),
            archived = COALESCE(?3, archived)
         WHERE id = ?4",
        params![name, color, archived.map(|b| b as i64), id],
    )?;
    if n == 0 { return Err(AppError::NotFound(format!("project {}", id))); }
    let p = conn.query_row(
        "SELECT id, name, color, archived, created_at FROM projects WHERE id = ?1",
        params![id],
        |r| Ok(Project {
            id: r.get(0)?,
            name: r.get(1)?,
            color: r.get(2)?,
            archived: r.get::<_, i64>(3)? != 0,
            created_at: r.get(4)?,
        }),
    )?;
    Ok(p)
}

pub fn archive(st: &AppState, id: i64, archived: bool) -> AppResult<()> {
    let conn = st.conn.lock().unwrap();
    let n = conn.execute(
        "UPDATE projects SET archived = ?1 WHERE id = ?2",
        params![archived as i64, id],
    )?;
    if n == 0 { return Err(AppError::NotFound(format!("project {}", id))); }
    Ok(())
}