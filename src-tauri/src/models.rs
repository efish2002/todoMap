use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Person {
    pub id: i64,
    pub name: String,
    pub avatar_path: Option<String>,
    pub organization: Option<String>,
    pub contact: Option<String>,
    pub is_me: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: i64,
    pub name: String,
    pub color: String,
    pub archived: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Todo {
    pub id: i64,
    pub title: String,
    pub description: Option<String>,
    pub status: String, // pending | in_progress | done | blocked
    pub priority: i32,   // 0 = none
    pub due_date: Option<String>,
    pub tags: Option<String>,
    pub project_id: i64,
    pub from_person_id: i64,
    pub to_person_id: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Comment {
    pub id: i64,
    pub todo_id: i64,
    pub author_id: i64,
    pub body: String,
    pub created_at: String,
}
