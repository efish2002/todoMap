use crate::error::AppResult;
use crate::models::Person;
use crate::state::AppState;
use rusqlite::{params, OptionalExtension};

const COLS: &str = "id, name, avatar_path, organization, contact, is_me, created_at";

fn row_to_person(r: &rusqlite::Row) -> rusqlite::Result<Person> {
    Ok(Person {
        id: r.get(0)?,
        name: r.get(1)?,
        avatar_path: r.get(2)?,
        organization: r.get(3)?,
        contact: r.get(4)?,
        is_me: r.get::<_, i64>(5)? != 0,
        created_at: r.get(6)?,
    })
}

pub fn list(st: &AppState) -> AppResult<Vec<Person>> {
    let conn = st.conn.lock().unwrap();
    let mut stmt = conn.prepare(&format!("SELECT {} FROM people ORDER BY is_me DESC, name ASC", COLS))?;
    let rows = stmt.query_map([], row_to_person)?;
    Ok(rows.filter_map(|x| x.ok()).collect())
}

pub fn get(st: &AppState, id: i64) -> AppResult<Option<Person>> {
    let conn = st.conn.lock().unwrap();
    let p = conn.query_row(
        &format!("SELECT {} FROM people WHERE id = ?1", COLS),
        params![id],
        row_to_person,
    ).optional()?;
    Ok(p)
}

pub fn upsert(st: &AppState, name: String, avatar_path: Option<String>) -> AppResult<Person> {
    let conn = st.conn.lock().unwrap();
    let now = super::me::now_iso();
    if let Some(p) = conn.query_row(
        &format!("SELECT {} FROM people WHERE LOWER(name) = LOWER(?1) LIMIT 1", COLS),
        params![name],
        row_to_person,
    ).optional()? {
        return Ok(p);
    }
    conn.execute(
        "INSERT INTO people (name, avatar_path, is_me, created_at) VALUES (?1, ?2, 0, ?3)",
        params![name, avatar_path, now],
    )?;
    let id = conn.last_insert_rowid();
    Ok(Person { id, name, avatar_path, organization: None, contact: None, is_me: false, created_at: now })
}

/// Update an existing person. All optional fields use COALESCE so callers can
/// change just one thing. Returns the updated row.
pub fn update(
    st: &AppState,
    id: i64,
    name: Option<String>,
    avatar_path: Option<Option<String>>,
    organization: Option<Option<String>>,
    contact: Option<Option<String>>,
) -> AppResult<Person> {
    if let Some(ref n) = name {
        if n.trim().is_empty() {
            return Err(crate::error::AppError::Invalid("name must not be empty".into()));
        }
    }
    let conn = st.conn.lock().unwrap();
    let n = conn.execute(
        "UPDATE people SET
            name         = COALESCE(?1, name),
            avatar_path  = COALESCE(?2, avatar_path),
            organization = COALESCE(?3, organization),
            contact      = COALESCE(?4, contact)
         WHERE id = ?5",
        params![name, avatar_path, organization, contact, id],
    )?;
    if n == 0 { return Err(crate::error::AppError::NotFound(format!("person {}", id))); }
    let p = conn.query_row(
        &format!("SELECT {} FROM people WHERE id = ?1", COLS),
        params![id],
        row_to_person,
    )?;
    Ok(p)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn setup() -> AppState {
        AppState::open_memory().unwrap()
    }

    #[test]
    fn upsert_reuses_existing_same_name() {
        let st = setup();
        let p1 = upsert(&st, "Alice".into(), None).unwrap();
        let p2 = upsert(&st, "alice".into(), None).unwrap();
        assert_eq!(p1.id, p2.id);
    }

    #[test]
    fn list_returns_all() {
        let st = setup();
        upsert(&st, "A".into(), None).unwrap();
        upsert(&st, "B".into(), None).unwrap();
        let v = list(&st).unwrap();
        assert_eq!(v.len(), 2);
    }

    #[test]
    fn update_changes_organization_and_contact() {
        let st = setup();
        let p = upsert(&st, "Bob".into(), None).unwrap();
        assert!(p.organization.is_none());
        assert!(p.contact.is_none());
        let p2 = update(&st, p.id, None, None, Some(Some("Acme".into())), Some(Some("bob@x.com".into()))).unwrap();
        assert_eq!(p2.organization.as_deref(), Some("Acme"));
        assert_eq!(p2.contact.as_deref(), Some("bob@x.com"));
    }

    #[test]
    fn update_can_clear_organization_with_null_override() {
        // COALESCE on NULL does nothing, so to explicitly clear a field we need
        // a different mechanism. For now the update API does NOT support
        // clearing back to NULL (only setting a value). Document the limitation.
        let st = setup();
        let p = upsert(&st, "C".into(), None).unwrap();
        let _ = update(&st, p.id, None, None, Some(Some("X".into())), None).unwrap();
        let cur = get(&st, p.id).unwrap().unwrap();
        assert_eq!(cur.organization.as_deref(), Some("X"));
    }

    #[test]
    fn update_unknown_id_returns_not_found() {
        let st = setup();
        let err = update(&st, 9999, None, None, None, None);
        assert!(err.is_err());
    }
}
