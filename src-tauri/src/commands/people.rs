use crate::error::AppResult;
use crate::models::Person;
use crate::state::AppState;
use rusqlite::{params, OptionalExtension};

pub fn list(st: &AppState) -> AppResult<Vec<Person>> {
    let conn = st.conn.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id, name, avatar_path, is_me, created_at FROM people ORDER BY is_me DESC, name ASC",
    )?;
    let rows = stmt.query_map([], |r| Ok(Person {
        id: r.get(0)?,
        name: r.get(1)?,
        avatar_path: r.get(2)?,
        is_me: r.get::<_, i64>(3)? != 0,
        created_at: r.get(4)?,
    }))?;
    Ok(rows.filter_map(|x| x.ok()).collect())
}

pub fn get(st: &AppState, id: i64) -> AppResult<Option<Person>> {
    let conn = st.conn.lock().unwrap();
    let p = conn.query_row(
        "SELECT id, name, avatar_path, is_me, created_at FROM people WHERE id = ?1",
        params![id],
        |r| Ok(Person {
            id: r.get(0)?,
            name: r.get(1)?,
            avatar_path: r.get(2)?,
            is_me: r.get::<_, i64>(3)? != 0,
            created_at: r.get(4)?,
        }),
    ).optional()?;
    Ok(p)
}

pub fn upsert(st: &AppState, name: String, avatar_path: Option<String>) -> AppResult<Person> {
    let conn = st.conn.lock().unwrap();
    let now = super::me::now_iso();
    if let Some(p) = conn.query_row(
        "SELECT id, name, avatar_path, is_me, created_at FROM people WHERE LOWER(name) = LOWER(?1) LIMIT 1",
        params![name],
        |r| Ok(Person {
            id: r.get(0)?,
            name: r.get(1)?,
            avatar_path: r.get(2)?,
            is_me: r.get::<_, i64>(3)? != 0,
            created_at: r.get(4)?,
        }),
    ).optional()? {
        return Ok(p);
    }
    conn.execute(
        "INSERT INTO people (name, avatar_path, is_me, created_at) VALUES (?1, ?2, 0, ?3)",
        params![name, avatar_path, now],
    )?;
    let id = conn.last_insert_rowid();
    Ok(Person { id, name, avatar_path, is_me: false, created_at: now })
}