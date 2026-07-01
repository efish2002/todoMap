use crate::error::{AppError, AppResult};
use crate::state::AppState;
use rusqlite::params;
use serde::{Deserialize, Serialize};

const SCHEMA_VERSION: i32 = 1;

#[derive(Serialize, Deserialize)]
struct ExportRoot {
    schema_version: i32,
    people: Vec<crate::models::Person>,
    projects: Vec<crate::models::Project>,
    todos: Vec<crate::models::Todo>,
    comments: Vec<crate::models::Comment>,
}

pub fn export_json(st: &AppState) -> AppResult<String> {
    let conn = st.conn.lock().unwrap();
    let people = {
        let mut s = conn.prepare("SELECT id, name, avatar_path, is_me, created_at FROM people")?;
        let rows = s.query_map([], |r| Ok((
            r.get::<_, i64>(0)?,
            r.get::<_, String>(1)?,
            r.get::<_, Option<String>>(2)?,
            r.get::<_, i64>(3)? != 0,
            r.get::<_, String>(4)?,
        )))?;
        rows.filter_map(|x| x.ok())
            .map(|(id, name, avatar_path, is_me, created_at)| crate::models::Person {
                id, name, avatar_path, is_me, created_at,
            })
            .collect::<Vec<_>>()
    };
    let projects = {
        let mut s = conn.prepare("SELECT id, name, color, archived, created_at FROM projects")?;
        let rows = s.query_map([], |r| Ok((
            r.get::<_, i64>(0)?,
            r.get::<_, String>(1)?,
            r.get::<_, String>(2)?,
            r.get::<_, i64>(3)? != 0,
            r.get::<_, String>(4)?,
        )))?;
        rows.filter_map(|x| x.ok())
            .map(|(id, name, color, archived, created_at)| crate::models::Project {
                id, name, color, archived, created_at,
            })
            .collect::<Vec<_>>()
    };
    let todos = {
        let mut s = conn.prepare(
            "SELECT id, title, description, status, priority, due_date, tags, project_id, from_person_id, to_person_id, created_at, updated_at FROM todos",
        )?;
        let rows = s.query_map([], |r| Ok(crate::models::Todo {
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
        }))?;
        rows.filter_map(|x| x.ok()).collect::<Vec<_>>()
    };
    let comments = {
        let mut s = conn.prepare("SELECT id, todo_id, author_id, body, created_at FROM comments")?;
        let rows = s.query_map([], |r| Ok(crate::models::Comment {
            id: r.get(0)?,
            todo_id: r.get(1)?,
            author_id: r.get(2)?,
            body: r.get(3)?,
            created_at: r.get(4)?,
        }))?;
        rows.filter_map(|x| x.ok()).collect::<Vec<_>>()
    };
    let root = ExportRoot { schema_version: SCHEMA_VERSION, people, projects, todos, comments };
    Ok(serde_json::to_string_pretty(&root)?)
}

pub fn import_json(st: &AppState, json: &str, merge: bool) -> AppResult<()> {
    let root: ExportRoot = serde_json::from_str(json)?;
    if root.schema_version != SCHEMA_VERSION {
        return Err(AppError::Invalid(format!(
            "schema_version {} not supported (this build: {})",
            root.schema_version, SCHEMA_VERSION
        )));
    }
    let conn = st.conn.lock().unwrap();

    if !merge {
        conn.execute("DELETE FROM comments", [])?;
        conn.execute("DELETE FROM todos", [])?;
        conn.execute("DELETE FROM projects", [])?;
        conn.execute("DELETE FROM people", [])?;
    }

    let tx = conn.unchecked_transaction()?;

    for p in &root.people {
        tx.execute(
            "INSERT OR REPLACE INTO people (id, name, avatar_path, is_me, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![p.id, p.name, p.avatar_path, p.is_me as i64, p.created_at],
        )?;
    }
    for p in &root.projects {
        tx.execute(
            "INSERT OR REPLACE INTO projects (id, name, color, archived, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![p.id, p.name, p.color, p.archived as i64, p.created_at],
        )?;
    }
    for t in &root.todos {
        tx.execute(
            "INSERT OR REPLACE INTO todos (id, title, description, status, priority, due_date, tags, project_id, from_person_id, to_person_id, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                t.id, t.title, t.description, t.status, t.priority, t.due_date, t.tags,
                t.project_id, t.from_person_id, t.to_person_id, t.created_at, t.updated_at
            ],
        )?;
    }
    for c in &root.comments {
        tx.execute(
            "INSERT OR IGNORE INTO comments (id, todo_id, author_id, body, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![c.id, c.todo_id, c.author_id, c.body, c.created_at],
        )?;
    }

    tx.commit()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn setup() -> AppState {
        AppState::open_memory().unwrap()
    }

    #[test]
    fn export_then_import_roundtrip() {
        let st = setup();
        let me = crate::commands::me::get_or_create_me(&st, "M".into(), None).unwrap();
        let other = crate::commands::people::upsert(&st, "O".into(), None).unwrap();
        let proj = crate::commands::projects::create(&st, "P".into(), "#3aa856".into()).unwrap();
        let t = crate::commands::todos::create(
            &st, "x".into(), None, 0, None, None, proj.id, me.id, other.id,
        ).unwrap();
        crate::commands::comments::add(&st, t.id, me.id, "hi".into()).unwrap();

        let json = export_json(&st).unwrap();
        assert!(json.contains("\"people\""));
        assert!(json.contains("\"O\""));

        let st2 = setup();
        import_json(&st2, &json, false).unwrap();
        let people2 = crate::commands::people::list(&st2).unwrap();
        let todos2 = crate::commands::todos::list_all(&st2).unwrap();
        let coms2 = crate::commands::comments::list(&st2, t.id).unwrap();
        assert!(people2.iter().any(|p| p.name == "O"));
        assert_eq!(todos2.len(), 1);
        assert_eq!(coms2.len(), 1);
    }

    #[test]
    fn wrong_schema_rejected() {
        let st = setup();
        let bad = r#"{ "schema_version": 999, "people": [], "projects": [], "todos": [], "comments": [] }"#;
        let err = import_json(&st, bad, false);
        assert!(err.is_err());
    }
}
