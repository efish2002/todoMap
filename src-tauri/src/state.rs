use crate::error::AppResult;
use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct AppState {
    pub conn: Mutex<Connection>,
    pub data_dir: PathBuf,
}

impl AppState {
    pub fn open(data_dir: PathBuf) -> AppResult<Self> {
        std::fs::create_dir_all(&data_dir)?;
        let db_path = data_dir.join("todomap.sqlite");
        let conn = crate::db::open(&db_path)?;
        Ok(Self { conn: Mutex::new(conn), data_dir })
    }
}