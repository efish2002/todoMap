use crate::error::{AppError, AppResult};
use crate::models::Comment;
use crate::state::AppState;
use rusqlite::params;

pub fn add(st: &AppState, todo_id: i64, author_id: i64, body: String) -> AppResult<Comment> {
    if body.trim().is_empty() {
        return Err(AppError::Invalid("comment body required".into()));
    }
    let conn = st.conn.lock().unwrap();
    let now = super::me::now_iso();
    conn.execute(
        "INSERT INTO comments (todo_id, author_id, body, created_at) VALUES (?1, ?2, ?3, ?4)",
        params![todo_id, author_id, body, now],
    )?;
    let id = conn.last_insert_rowid();
    Ok(Comment { id, todo_id, author_id, body, created_at: now })
}

pub fn list(st: &AppState, todo_id: i64) -> AppResult<Vec<Comment>> {
    let conn = st.conn.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id, todo_id, author_id, body, created_at FROM comments WHERE todo_id = ?1 ORDER BY created_at DESC",
    )?;
    let rows = stmt.query_map(params![todo_id], |r| Ok(Comment {
        id: r.get(0)?,
        todo_id: r.get(1)?,
        author_id: r.get(2)?,
        body: r.get(3)?,
        created_at: r.get(4)?,
    }))?;
    Ok(rows.filter_map(|x| x.ok()).collect())
}

pub fn delete(st: &AppState, id: i64) -> AppResult<()> {
    let conn = st.conn.lock().unwrap();
    let n = conn.execute("DELETE FROM comments WHERE id = ?1", params![id])?;
    if n == 0 { return Err(AppError::NotFound(format!("comment {}", id))); }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn setup() -> (AppState, i64, i64) {
        let st = AppState::open_memory().unwrap();
        let me = crate::commands::me::get_or_create_me(&st, "M".into(), None).unwrap();
        let other = crate::commands::people::upsert(&st, "O".into(), None).unwrap();
        let proj = crate::commands::projects::create(&st, "P".into(), "#000000".into()).unwrap();
        let t = crate::commands::todos::create(&st, "x".into(), None, 0, None, None, proj.id, me.id, other.id).unwrap();
        (st, t.id, me.id)
    }

    #[test]
    fn add_then_list_then_delete() {
        let (st, todo_id, me_id) = setup();
        let c = add(&st, todo_id, me_id, "hello".into()).unwrap();
        let list1 = list(&st, todo_id).unwrap();
        assert_eq!(list1.len(), 1);
        assert_eq!(list1[0].body, "hello");
        assert_eq!(list1[0].id, c.id);

        delete(&st, c.id).unwrap();
        let list2 = list(&st, todo_id).unwrap();
        assert_eq!(list2.len(), 0);
    }

    #[test]
    fn empty_body_rejected() {
        let (st, todo_id, me_id) = setup();
        let err = add(&st, todo_id, me_id, "   ".into());
        assert!(err.is_err());
    }

    #[test]
    fn delete_missing_returns_not_found() {
        let (st, _todo_id, _me_id) = setup();
        let err = delete(&st, 9999);
        assert!(err.is_err());
    }
}
