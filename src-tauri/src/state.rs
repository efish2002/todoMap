use crate::error::AppResult;
use rusqlite::Connection;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

pub struct AppState {
    pub conn: Arc<Mutex<Connection>>,
    pub data_dir: PathBuf,
}

impl AppState {
    pub fn open(data_dir: PathBuf) -> AppResult<Self> {
        std::fs::create_dir_all(&data_dir)?;
        let db_path = data_dir.join("todomap.sqlite");
        let conn = crate::db::open(&db_path)?;
        Ok(Self { conn: Arc::new(Mutex::new(conn)), data_dir })
    }

    /// In-memory variant for tests; no file lock, no WAL.
    pub fn open_memory() -> AppResult<Self> {
        let conn = crate::db::open_memory()?;
        Ok(Self { conn: Arc::new(Mutex::new(conn)), data_dir: PathBuf::new() })
    }

    /// Returns a lightweight handle sharing the same underlying connection.
    /// Useful for tests that want to share state without copying Connection.
    /// Test variant: file-based but DELETE journal (no WAL cleanup hang).
    /// Caller is responsible for deleting the file at path after use.
    pub fn open_test(path: &Path) -> AppResult<Self> {
        let conn = crate::db::open_test(path)?;
        Ok(Self { conn: Arc::new(Mutex::new(conn)), data_dir: path.to_path_buf() })
    }

    pub fn clone_state(&self) -> Self {
        Self {
            conn: Arc::clone(&self.conn),
            data_dir: self.data_dir.clone(),
        }
    }
}

impl Clone for AppState {
    fn clone(&self) -> Self {
        self.clone_state()
    }
}