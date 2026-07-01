use crate::error::AppResult;
use rusqlite::Connection;
use std::path::Path;

pub fn open(path: &Path) -> AppResult<Connection> {
    let conn = Connection::open(path)?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    conn.pragma_update(None, "journal_mode", "WAL")?;
    migrate(&conn)?;
    Ok(conn)
}

/// Test-only: file-based db with DELETE journal (no WAL), avoiding
/// the Windows WAL cleanup hang. Caller is responsible for cleanup.
pub fn open_test(path: &Path) -> AppResult<Connection> {
    let conn = Connection::open(path)?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    conn.pragma_update(None, "journal_mode", "DELETE")?;
    migrate(&conn)?;
    Ok(conn)
}

/// In-memory DB for tests; avoids WAL file lock on Windows.
pub fn open_memory() -> AppResult<Connection> {
    let conn = Connection::open_in_memory()?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    migrate(&conn)?;
    Ok(conn)
}


fn add_column_if_missing(conn: &Connection, table: &str, column: &str, decl: &str) -> AppResult<()> {
    let mut stmt = conn.prepare(&format!("PRAGMA table_info({})", table))?;
    let mut rows = stmt.query([])?;
    while let Some(row) = rows.next()? {
        let name: String = row.get(1)?;
        if name == column { return Ok(()); }
    }
    let sql = format!("ALTER TABLE {} ADD COLUMN {} {}", table, column, decl);
    conn.execute(&sql, [])?;
    Ok(())
}

fn migrate(conn: &Connection) -> AppResult<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS people (
            id            INTEGER PRIMARY KEY,
            name          TEXT NOT NULL,
            avatar_path   TEXT,
            is_me         INTEGER NOT NULL DEFAULT 0,
            organization  TEXT,
            contact       TEXT,
            created_at    TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS projects (
            id            INTEGER PRIMARY KEY,
            name          TEXT NOT NULL,
            color         TEXT NOT NULL,
            archived      INTEGER NOT NULL DEFAULT 0,
            created_at    TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS todos (
            id              INTEGER PRIMARY KEY,
            title           TEXT NOT NULL,
            description     TEXT,
            status          TEXT NOT NULL DEFAULT 'pending',
            priority        INTEGER NOT NULL DEFAULT 0,
            due_date        TEXT,
            tags            TEXT,
            project_id      INTEGER NOT NULL REFERENCES projects(id),
            from_person_id  INTEGER NOT NULL REFERENCES people(id),
            to_person_id    INTEGER NOT NULL REFERENCES people(id),
            created_at      TEXT NOT NULL,
            updated_at      TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS comments (
            id          INTEGER PRIMARY KEY,
            todo_id     INTEGER NOT NULL REFERENCES todos(id),
            author_id   INTEGER NOT NULL REFERENCES people(id),
            body        TEXT NOT NULL,
            created_at  TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_todos_from ON todos(from_person_id);
        CREATE INDEX IF NOT EXISTS idx_todos_to   ON todos(to_person_id);
        CREATE INDEX IF NOT EXISTS idx_todos_proj ON todos(project_id);
        "#,
    )?;
    add_column_if_missing(conn, "people", "organization", "TEXT")?;
    add_column_if_missing(conn, "people", "contact", "TEXT")?;
    Ok(())
}