# todoMap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local desktop app (Tauri 2 + React + TypeScript) that records a project work network: people as nodes, delegated todos as edges, with project-based color coding and "me" at the center.

**Architecture:** Three-layer Tauri app. Rust backend owns SQLite access and exposes CRUD through Tauri commands. React frontend renders the graph (React Flow) and sidebar; never talks to SQLite directly. SQLite stores people, projects, todos, and comments. Single-user MVP with JSON export/import so the data is portable to a future multi-user version.

**Tech Stack:** Tauri 2, Rust 2021, SQLite (rusqlite), React 18, TypeScript, Vite, React Flow, plain CSS.

---

## File Structure

```
todoMap/
|-- src-tauri/                       # Rust backend (Tauri)
|   |-- Cargo.toml
|   |-- tauri.conf.json
|   |-- build.rs
|   |-- src/
|       |-- main.rs                  # entry
|       |-- lib.rs                   # builder + module declarations
|       |-- db.rs                    # connection, migrations
|       |-- models.rs                # Person, Project, Todo, Comment
|       |-- state.rs                 # AppState
|       |-- error.rs                 # AppError
|       |-- commands/
|           |-- mod.rs
|           |-- me.rs                # get_or_create_me, set_my_avatar, now_iso
|           |-- people.rs            # list, get, upsert
|           |-- projects.rs          # list, create, update, archive
|           |-- todos.rs             # list, create, update, delete, set_status
|           |-- comments.rs          # add, list, delete
|           |-- export.rs            # export_json, import_json
|           |-- ipc.rs               # #[tauri::command] wrappers
|-- src/                             # React frontend
|   |-- main.tsx
|   |-- App.tsx
|   |-- api.ts
|   |-- types.ts
|   |-- components/
|   |   |-- GraphView.tsx
|   |   |-- Sidebar.tsx
|   |   |-- TodoDialog.tsx
|   |   |-- ProjectDialog.tsx
|   |   |-- OnboardingDialog.tsx
|   |   |-- NewPersonDialog.tsx
|   |   |-- EmptyState.tsx
|   |-- styles.css
|   |-- graph/
|       |-- layout.ts
|       |-- layout.test.ts
|       |-- edges.ts
|       |-- edges.test.ts
|-- docs/
    |-- superpowers/
        |-- specs/2026-07-01-todoMap-design.md
        |-- plans/2026-07-01-todoMap-implementation.md
```

---

## Conventions

- Commits use Conventional Commits (`feat:`, `test:`, `chore:`, `docs:`, `refactor:`, `fix:`).
- After every task: `cd E:\Work\todoMap && git add <files> && git commit -m "<message>"`.
- Tauri commands live in `src-tauri/src/commands/`; storage functions are sync, IPC wrappers (`ipc.rs`) wrap them in `#[tauri::command]`.
- All paths in this plan are absolute starting at `E:\Work\todoMap`.
- In code blocks, single backslash Windows paths are escaped as `\\` so they survive Markdown; in shell examples, single backslashes are intentional (PowerShell/cmd form).

---

## Phase 0 — Repository setup

### Task 0.1: Initialize Tauri 2 + Vite + React + TypeScript project

**Files:**
- Create: `E:\Work\todoMap\package.json`
- Create: `E:\Work\todoMap\vite.config.ts`
- Create: `E:\Work\todoMap\tsconfig.json`
- Create: `E:\Work\todoMap\index.html`
- Create: `E:\Work\todoMap\src\main.tsx`
- Create: `E:\Work\todoMap\src\App.tsx`
- Create: `E:\Work\todoMap\src\styles.css`
- Create: `E:\Work\todoMap\src-tauri\Cargo.toml`
- Create: `E:\Work\todoMap\src-tauri\tauri.conf.json`
- Create: `E:\Work\todoMap\src-tauri\build.rs`
- Create: `E:\Work\todoMap\src-tauri\src\main.rs`
- Create: `E:\Work\todoMap\src-tauri\src\lib.rs`

- [ ] **Step 1: Verify toolchain**

Run: `node --version && npm --version && rustc --version`
Expected: all three return versions. If `rustc` missing, install via https://rustup.rs.

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "todomap",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "tauri": "tauri"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "reactflow": "^11.11.4",
    "@tauri-apps/api": "^2.0.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 3: Create `vite.config.ts`**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  envPrefix: ["VITE_", "TAURI_ENV_*"],
  build: { target: "es2021", minify: "esbuild", sourcemap: true }
});
```

- [ ] **Step 4: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "lib": ["ES2021", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Create `index.html`**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>todoMap</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create `src/main.tsx`** (minimal; expanded in Task 6.2)

```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 7: Create `src/App.tsx`** (placeholder; full version in Task 6.1)

```typescript
export default function App() {
  return <div className="app">todoMap</div>;
}
```

- [ ] **Step 8: Create `src/styles.css`** (placeholder; full CSS in Task 6.1)

```css
html, body, #root { height: 100%; margin: 0; }
body { background: #0f1320; color: #eee; font-family: system-ui, sans-serif; }
.app { padding: 16px; }
```

- [ ] **Step 9: Create `src-tauri/tauri.conf.json`**

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "todoMap",
  "version": "0.1.0",
  "identifier": "com.todomap.app",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:1420",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "windows": [{ "title": "todoMap", "width": 1280, "height": 800 }],
    "security": { "csp": null }
  },
  "bundle": { "active": true, "targets": "all" }
}
```

- [ ] **Step 10: Create `src-tauri/Cargo.toml`**

```toml
[package]
name = "todomap"
version = "0.1.0"
edition = "2021"

[lib]
name = "todomap_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
rusqlite = { version = "0.31", features = ["bundled"] }
thiserror = "1"

[dev-dependencies]
tempfile = "3"
```

- [ ] **Step 11: Create `src-tauri/build.rs`**

```rust
fn main() {
    tauri_build::build()
}
```

- [ ] **Step 12: Create `src-tauri/src/main.rs`**

```rust
fn main() {
    todomap_lib::run()
}
```

- [ ] **Step 13: Create minimal `src-tauri/src/lib.rs`** (expanded in Task 1.4)

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|_app| Ok(()))
        .run(tauri::generate_context!())
        .expect("error while running todoMap");
}
```

- [ ] **Step 14: Install dependencies**

Run: `cd E:\Work\todoMap && npm install`
Expected: `node_modules/` created, no errors.

- [ ] **Step 15: Verify the frontend builds**

Run: `cd E:\Work\todoMap && npm run build`
Expected: `dist/` folder created, no TypeScript errors.

- [ ] **Step 16: Commit**

```bash
cd E:\Work\todoMap && git add -A && git commit -m "chore: scaffold tauri 2 + react + typescript project"
```

---

## Phase 1 — Data layer (SQLite + Rust commands)

### Task 1.1: Error type and AppError

**Files:**
- Create: `E:\Work\todoMap\src-tauri\src\error.rs`

- [ ] **Step 1: Create the file**

```rust
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("database error: {0}")]
    Db(#[from] rusqlite::Error),
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("json error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("not found: {0}")]
    NotFound(String),
    #[error("invalid: {0}")]
    Invalid(String),
}

impl Serialize for AppError {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}

pub type AppResult<T> = std::result::Result<T, AppError>;
```

- [ ] **Step 2: Commit**

```bash
cd E:\Work\todoMap && git add src-tauri/src/error.rs && git commit -m "feat(tauri): add AppError type"
```

### Task 1.2: Models

**Files:**
- Create: `E:\Work\todoMap\src-tauri\src\models.rs`

- [ ] **Step 1: Create the file**

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Person {
    pub id: i64,
    pub name: String,
    pub avatar_path: Option<String>,
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
```

- [ ] **Step 2: Commit**

```bash
cd E:\Work\todoMap && git add src-tauri/src/models.rs && git commit -m "feat(tauri): add core data models"
```

### Task 1.3: DB connection + migrations

**Files:**
- Create: `E:\Work\todoMap\src-tauri\src\db.rs`

- [ ] **Step 1: Create the file**

```rust
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

fn migrate(conn: &Connection) -> AppResult<()> {
    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS people (
            id            INTEGER PRIMARY KEY,
            name          TEXT NOT NULL,
            avatar_path   TEXT,
            is_me         INTEGER NOT NULL DEFAULT 0,
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
    Ok(())
}
```

- [ ] **Step 2: Commit**

```bash
cd E:\Work\todoMap && git add src-tauri/src/db.rs && git commit -m "feat(tauri): add sqlite open + migrations"
```

### Task 1.4: AppState + lib.rs wiring

**Files:**
- Create: `E:\Work\todoMap\src-tauri\src\state.rs`
- Modify: `E:\Work\todoMap\src-tauri\src\lib.rs`
- Create: `E:\Work\todoMap\src-tauri\src\commands\mod.rs`

- [ ] **Step 1: Create `state.rs`**

```rust
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
```

- [ ] **Step 2: Update `lib.rs`**

```rust
pub mod commands;
pub mod db;
pub mod error;
pub mod models;
pub mod state;

use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let dir = app.path().app_data_dir().expect("no app data dir");
            let st = AppState::open(dir).map_err(|e| e.to_string())?;
            app.manage(st);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running todoMap");
}
```

- [ ] **Step 3: Create empty `commands/mod.rs`**

```rust
```

- [ ] **Step 4: Commit**

```bash
cd E:\Work\todoMap && git add src-tauri/src/lib.rs src-tauri/src/state.rs src-tauri/src/commands/mod.rs && git commit -m "feat(tauri): add AppState and wire into Tauri builder"
```

### Task 1.5: `me.rs` — get_or_create_me (with `now_iso` helper)

**Files:**
- Create: `E:\Work\todoMap\src-tauri\src\commands\me.rs`
- Modify: `E:\Work\todoMap\src-tauri\src\commands\mod.rs`
- Create: `E:\Work\todoMap\src-tauri\tests\me.rs`

- [ ] **Step 1: Create `tests/me.rs`**

```rust
use tempfile::tempdir;
use todomap_lib::state::AppState;

#[test]
fn get_or_create_me_creates_then_returns() {
    let dir = tempdir().unwrap();
    let st = AppState::open(dir.path().to_path_buf()).unwrap();

    let me1 = todomap_lib::commands::me::get_or_create_me(
        &st, "高浩".to_string(), None,
    ).unwrap();
    assert_eq!(me1.name, "高浩");
    assert!(me1.is_me);

    let me2 = todomap_lib::commands::me::get_or_create_me(
        &st, "高浩".to_string(), None,
    ).unwrap();
    assert_eq!(me1.id, me2.id);

    let conn = rusqlite::Connection::open(dir.path().join("todomap.sqlite")).unwrap();
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM people WHERE is_me = 1", [], |r| r.get(0))
        .unwrap();
    assert_eq!(count, 1);
}
```

- [ ] **Step 2: Create `commands/me.rs`**

```rust
use crate::error::{AppError, AppResult};
use crate::models::Person;
use crate::state::AppState;
use rusqlite::params;

pub fn get_or_create_me(
    st: &AppState,
    name: String,
    avatar_path: Option<String>,
) -> AppResult<Person> {
    let conn = st.conn.lock().unwrap();
    let now = now_iso();

    if let Ok(p) = conn.query_row(
        "SELECT id, name, avatar_path, is_me, created_at FROM people WHERE is_me = 1",
        [],
        |r| Ok(Person {
            id: r.get(0)?,
            name: r.get(1)?,
            avatar_path: r.get(2)?,
            is_me: r.get::<_, i64>(3)? != 0,
            created_at: r.get(4)?,
        }),
    ) {
        return Ok(p);
    }

    if name.trim().is_empty() {
        return Err(AppError::Invalid("name must not be empty".into()));
    }

    conn.execute(
        "INSERT INTO people (name, avatar_path, is_me, created_at) VALUES (?1, ?2, 1, ?3)",
        params![name, avatar_path, now],
    )?;
    let id = conn.last_insert_rowid();
    Ok(Person { id, name, avatar_path, is_me: true, created_at: now })
}

pub fn set_my_avatar(st: &AppState, avatar_path: Option<String>) -> AppResult<()> {
    let conn = st.conn.lock().unwrap();
    let changed = conn.execute(
        "UPDATE people SET avatar_path = ?1 WHERE is_me = 1",
        params![avatar_path],
    )?;
    if changed == 0 {
        return Err(AppError::NotFound("me".into()));
    }
    Ok(())
}

/// Returns "YYYY-MM-DDTHH:MM:SSZ" in UTC. Public so other modules can stamp rows.
pub fn now_iso() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let (y, m, d, h, mi, s) = epoch_to_ymdhms(secs);
    format!("{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z", y, m, d, h, mi, s)
}

fn epoch_to_ymdhms(secs: u64) -> (i32, u32, u32, u32, u32, u32) {
    let z = (secs / 86400) as i64 + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = (z - era * 146097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = (if mp < 10 { mp + 3 } else { mp - 9 }) as u32;
    let y = (if m <= 2 { y + 1 } else { y }) as i32;
    let secs_today = secs % 86400;
    let h = (secs_today / 3600) as u32;
    let mi = ((secs_today % 3600) / 60) as u32;
    let s = (secs_today % 60) as u32;
    (y, m, d, h, mi, s)
}
```

- [ ] **Step 3: Update `commands/mod.rs`**

```rust
pub mod me;
```

- [ ] **Step 4: Run the test**

Run: `cd E:\Work\todoMap\src-tauri && cargo test --test me`
Expected: `1 passed`.

- [ ] **Step 5: Commit**

```bash
cd E:\Work\todoMap && git add -A && git commit -m "feat(tauri): get_or_create_me + set_my_avatar with tests"
```

### Task 1.6: `people.rs` — list, upsert

**Files:**
- Create: `E:\Work\todoMap\src-tauri\src\commands\people.rs`
- Modify: `E:\Work\todoMap\src-tauri\src\commands\mod.rs`
- Create: `E:\Work\todoMap\src-tauri\tests\people.rs`

- [ ] **Step 1: Create `tests/people.rs`**

```rust
use tempfile::tempdir;
use todomap_lib::state::AppState;

#[test]
fn upsert_reuses_existing_same_name() {
    let dir = tempdir().unwrap();
    let st = AppState::open(dir.path().to_path_buf()).unwrap();

    let p1 = todomap_lib::commands::people::upsert(&st, "小王".into(), None).unwrap();
    let p2 = todomap_lib::commands::people::upsert(&st, "小王".into(), None).unwrap();
    assert_eq!(p1.id, p2.id);
}

#[test]
fn list_returns_all() {
    let dir = tempdir().unwrap();
    let st = AppState::open(dir.path().to_path_buf()).unwrap();
    todomap_lib::commands::people::upsert(&st, "A".into(), None).unwrap();
    todomap_lib::commands::people::upsert(&st, "B".into(), None).unwrap();
    let v = todomap_lib::commands::people::list(&st).unwrap();
    assert_eq!(v.len(), 2);
}
```

- [ ] **Step 2: Create `commands/people.rs`**

```rust
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

/// Reuses an existing person with the same name (case-insensitive). Otherwise inserts.
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
```

- [ ] **Step 3: Update `commands/mod.rs`**

```rust
pub mod me;
pub mod people;
```

- [ ] **Step 4: Run the tests**

Run: `cd E:\Work\todoMap\src-tauri && cargo test --test people`
Expected: `2 passed`.

- [ ] **Step 5: Commit**

```bash
cd E:\Work\todoMap && git add -A && git commit -m "feat(tauri): people list/get/upsert with tests"
```

### Task 1.7: `projects.rs` — list, create, update, archive

**Files:**
- Create: `E:\Work\todoMap\src-tauri\src\commands\projects.rs`
- Modify: `E:\Work\todoMap\src-tauri\src\commands\mod.rs`
- Create: `E:\Work\todoMap\src-tauri\tests\projects.rs`

- [ ] **Step 1: Create `tests/projects.rs`**

```rust
use tempfile::tempdir;
use todomap_lib::state::AppState;

#[test]
fn create_then_update_color() {
    let dir = tempdir().unwrap();
    let st = AppState::open(dir.path().to_path_buf()).unwrap();
    let p = todomap_lib::commands::projects::create(
        &st, "项目A".into(), "#3aa856".into(),
    ).unwrap();
    assert_eq!(p.color, "#3aa856");

    let p2 = todomap_lib::commands::projects::update(
        &st, p.id, None, Some("#ff0000".into()), None,
    ).unwrap();
    assert_eq!(p2.color, "#ff0000");
}

#[test]
fn archive_hides_from_list_when_filtered() {
    let dir = tempdir().unwrap();
    let st = AppState::open(dir.path().to_path_buf()).unwrap();
    let p = todomap_lib::commands::projects::create(
        &st, "X".into(), "#000000".into(),
    ).unwrap();
    todomap_lib::commands::projects::archive(&st, p.id, true).unwrap();
    let active = todomap_lib::commands::projects::list(&st, false).unwrap();
    let all = todomap_lib::commands::projects::list(&st, true).unwrap();
    assert_eq!(active.len(), 0);
    assert_eq!(all.len(), 1);
}
```

- [ ] **Step 2: Create `commands/projects.rs`**

```rust
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
```

- [ ] **Step 3: Update `commands/mod.rs`**

```rust
pub mod me;
pub mod people;
pub mod projects;
```

- [ ] **Step 4: Run tests**

Run: `cd E:\Work\todoMap\src-tauri && cargo test --test projects`
Expected: `2 passed`.

- [ ] **Step 5: Commit**

```bash
cd E:\Work\todoMap && git add -A && git commit -m "feat(tauri): projects CRUD with tests"
```

### Task 1.8: `todos.rs` — list, create, update, delete

**Files:**
- Create: `E:\Work\todoMap\src-tauri\src\commands\todos.rs`
- Modify: `E:\Work\todoMap\src-tauri\src\commands\mod.rs`
- Create: `E:\Work\todoMap\src-tauri\tests\todos.rs`

- [ ] **Step 1: Create `tests/todos.rs`**

```rust
use tempfile::tempdir;
use todomap_lib::state::AppState;

fn setup() -> (AppState, i64, i64) {
    let dir = tempdir().unwrap();
    let st = AppState::open(dir.path().to_path_buf()).unwrap();
    let _me = todomap_lib::commands::me::get_or_create_me(
        &st, "我".into(), None,
    ).unwrap();
    let other = todomap_lib::commands::people::upsert(
        &st, "小王".into(), None,
    ).unwrap();
    let proj = todomap_lib::commands::projects::create(
        &st, "项目A".into(), "#3aa856".into(),
    ).unwrap();
    (st, other.id, proj.id)
}

#[test]
fn create_then_list_for_person() {
    let (st, other_id, proj_id) = setup();
    let t = todomap_lib::commands::todos::create(
        &st, "写 API".into(), None, 1, Some("2026-08-01".into()),
        None, proj_id, 1, other_id,
    ).unwrap();
    assert_eq!(t.status, "pending");
    let from_me = todomap_lib::commands::todos::list_for_person(&st, 1).unwrap();
    let to_other = todomap_lib::commands::todos::list_for_person(&st, other_id).unwrap();
    assert_eq!(from_me.len(), 1);
    assert_eq!(to_other.len(), 1);
}

#[test]
fn cannot_self_delegate() {
    let (st, _other_id, proj_id) = setup();
    let err = todomap_lib::commands::todos::create(
        &st, "x".into(), None, 0, None, None, proj_id, 1, 1,
    );
    assert!(err.is_err());
}

#[test]
fn set_status_done() {
    let (st, other_id, proj_id) = setup();
    let t = todomap_lib::commands::todos::create(
        &st, "x".into(), None, 0, None, None, proj_id, 1, other_id,
    ).unwrap();
    let t2 = todomap_lib::commands::todos::set_status(&st, t.id, "done".into()).unwrap();
    assert_eq!(t2.status, "done");
}
```

- [ ] **Step 2: Create `commands/todos.rs`**

```rust
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
        "SELECT id, title, description, status, priority, due_date, tags,
                project_id, from_person_id, to_person_id, created_at, updated_at
         FROM todos {} ORDER BY created_at DESC",
        where_clause
    )
}

pub fn list_all(st: &AppState) -> AppResult<Vec<Todo>> {
    let conn = st.conn.lock().unwrap();
    let mut stmt = conn.prepare(&select_sql(""))?;
    let rows = stmt.query_map([], row_to_todo)?;
    Ok(rows.filter_map(|x| x.ok()).collect())
}

pub fn list_for_person(st: &AppState, person_id: i64) -> AppResult<Vec<Todo>> {
    let conn = st.conn.lock().unwrap();
    let mut stmt = conn.prepare(&select_sql(
        "WHERE from_person_id = ?1 OR to_person_id = ?1"
    ))?;
    let rows = stmt.query_map(params![person_id], row_to_todo)?;
    Ok(rows.filter_map(|x| x.ok()).collect())
}

pub fn get(st: &AppState, id: i64) -> AppResult<Todo> {
    let conn = st.conn.lock().unwrap();
    let t = conn.query_row(&select_sql("WHERE id = ?1"), params![id], row_to_todo)?;
    Ok(t)
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
        "INSERT INTO todos
            (title, description, status, priority, due_date, tags,
             project_id, from_person_id, to_person_id, created_at, updated_at)
         VALUES (?1, ?2, 'pending', ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)",
        params![
            title, description, priority, due_date, tags,
            project_id, from_person_id, to_person_id, now
        ],
    )?;
    let id = conn.last_insert_rowid();
    get(st, id)
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
        "UPDATE todos SET
            title          = COALESCE(?1, title),
            description    = COALESCE(?2, description),
            status         = COALESCE(?3, status),
            priority       = COALESCE(?4, priority),
            project_id     = COALESCE(?5, project_id),
            from_person_id = COALESCE(?6, from_person_id),
            to_person_id   = COALESCE(?7, to_person_id),
            updated_at     = ?8
         WHERE id = ?9",
        params![
            title, description, status, priority,
            project_id, from_person_id, to_person_id,
            now, id
        ],
    )?;
    if n == 0 { return Err(AppError::NotFound(format!("todo {}", id))); }
    get(st, id)
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
```

- [ ] **Step 3: Update `commands/mod.rs`**

```rust
pub mod me;
pub mod people;
pub mod projects;
pub mod todos;
```

- [ ] **Step 4: Run tests**

Run: `cd E:\Work\todoMap\src-tauri && cargo test --test todos`
Expected: `3 passed`.

- [ ] **Step 5: Commit**

```bash
cd E:\Work\todoMap && git add -A && git commit -m "feat(tauri): todos CRUD with tests"
```

### Task 1.9: `comments.rs`

**Files:**
- Create: `E:\Work\todoMap\src-tauri\src\commands\comments.rs`
- Modify: `E:\Work\todoMap\src-tauri\src\commands\mod.rs`
- Create: `E:\Work\todoMap\src-tauri\tests\comments.rs`

- [ ] **Step 1: Create `tests/comments.rs`**

```rust
use tempfile::tempdir;
use todomap_lib::state::AppState;

#[test]
fn add_then_list_then_delete() {
    let dir = tempdir().unwrap();
    let st = AppState::open(dir.path().to_path_buf()).unwrap();
    let me = todomap_lib::commands::me::get_or_create_me(&st, "我".into(), None).unwrap();
    let other = todomap_lib::commands::people::upsert(&st, "小王".into(), None).unwrap();
    let proj = todomap_lib::commands::projects::create(&st, "P".into(), "#000000".into()).unwrap();
    let t = todomap_lib::commands::todos::create(
        &st, "x".into(), None, 0, None, None, proj.id, me.id, other.id,
    ).unwrap();

    let c = todomap_lib::commands::comments::add(&st, t.id, me.id, "你好".into()).unwrap();
    let list = todomap_lib::commands::comments::list(&st, t.id).unwrap();
    assert_eq!(list.len(), 1);

    todomap_lib::commands::comments::delete(&st, c.id).unwrap();
    let list2 = todomap_lib::commands::comments::list(&st, t.id).unwrap();
    assert_eq!(list2.len(), 0);
}
```

- [ ] **Step 2: Create `commands/comments.rs`**

```rust
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
        "SELECT id, todo_id, author_id, body, created_at
         FROM comments WHERE todo_id = ?1 ORDER BY created_at DESC",
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
```

- [ ] **Step 3: Update `commands/mod.rs`**

```rust
pub mod me;
pub mod people;
pub mod projects;
pub mod todos;
pub mod comments;
```

- [ ] **Step 4: Run test**

Run: `cd E:\Work\todoMap\src-tauri && cargo test --test comments`
Expected: `1 passed`.

- [ ] **Step 5: Commit**

```bash
cd E:\Work\todoMap && git add -A && git commit -m "feat(tauri): comments add/list/delete with tests"
```

### Task 1.10: Tauri IPC command surface

**Files:**
- Create: `E:\Work\todoMap\src-tauri\src\commands\ipc.rs`
- Modify: `E:\Work\todoMap\src-tauri\src\commands\mod.rs`
- Modify: `E:\Work\todoMap\src-tauri\src\lib.rs`

- [ ] **Step 1: Create `commands/ipc.rs`**

```rust
use crate::error::AppResult;
use crate::models::{Comment, Person, Project, Todo};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
pub fn get_or_create_me(
    st: State<'_, AppState>,
    name: String,
    avatar_path: Option<String>,
) -> AppResult<Person> {
    super::me::get_or_create_me(&st, name, avatar_path)
}

#[tauri::command]
pub fn set_my_avatar(
    st: State<'_, AppState>,
    avatar_path: Option<String>,
) -> AppResult<()> {
    super::me::set_my_avatar(&st, avatar_path)
}

#[tauri::command]
pub fn list_people(st: State<'_, AppState>) -> AppResult<Vec<Person>> {
    super::people::list(&st)
}

#[tauri::command]
pub fn upsert_person(
    st: State<'_, AppState>,
    name: String,
    avatar_path: Option<String>,
) -> AppResult<Person> {
    super::people::upsert(&st, name, avatar_path)
}

#[tauri::command]
pub fn list_projects(
    st: State<'_, AppState>,
    include_archived: bool,
) -> AppResult<Vec<Project>> {
    super::projects::list(&st, include_archived)
}

#[tauri::command]
pub fn create_project(
    st: State<'_, AppState>,
    name: String,
    color: String,
) -> AppResult<Project> {
    super::projects::create(&st, name, color)
}

#[tauri::command]
pub fn update_project(
    st: State<'_, AppState>,
    id: i64,
    name: Option<String>,
    color: Option<String>,
    archived: Option<bool>,
) -> AppResult<Project> {
    super::projects::update(&st, id, name, color, archived)
}

#[tauri::command]
pub fn list_todos(st: State<'_, AppState>) -> AppResult<Vec<Todo>> {
    super::todos::list_all(&st)
}

#[tauri::command]
pub fn list_todos_for_person(
    st: State<'_, AppState>,
    person_id: i64,
) -> AppResult<Vec<Todo>> {
    super::todos::list_for_person(&st, person_id)
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub fn create_todo(
    st: State<'_, AppState>,
    title: String,
    description: Option<String>,
    priority: i32,
    due_date: Option<String>,
    tags: Option<String>,
    project_id: i64,
    from_person_id: i64,
    to_person_id: i64,
) -> AppResult<Todo> {
    super::todos::create(
        &st, title, description, priority, due_date, tags,
        project_id, from_person_id, to_person_id,
    )
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub fn update_todo(
    st: State<'_, AppState>,
    id: i64,
    title: Option<String>,
    description: Option<String>,
    status: Option<String>,
    priority: Option<i32>,
    project_id: Option<i64>,
    from_person_id: Option<i64>,
    to_person_id: Option<i64>,
) -> AppResult<Todo> {
    super::todos::update(
        &st, id, title, description, status, priority,
        None, None, project_id, from_person_id, to_person_id,
    )
}

#[tauri::command]
pub fn set_todo_status(
    st: State<'_, AppState>,
    id: i64,
    status: String,
) -> AppResult<Todo> {
    super::todos::set_status(&st, id, status)
}

#[tauri::command]
pub fn delete_todo(st: State<'_, AppState>, id: i64) -> AppResult<()> {
    super::todos::delete(&st, id)
}

#[tauri::command]
pub fn add_comment(
    st: State<'_, AppState>,
    todo_id: i64,
    author_id: i64,
    body: String,
) -> AppResult<Comment> {
    super::comments::add(&st, todo_id, author_id, body)
}

#[tauri::command]
pub fn list_comments(
    st: State<'_, AppState>,
    todo_id: i64,
) -> AppResult<Vec<Comment>> {
    super::comments::list(&st, todo_id)
}

#[tauri::command]
pub fn delete_comment(st: State<'_, AppState>, id: i64) -> AppResult<()> {
    super::comments::delete(&st, id)
}
```

- [ ] **Step 2: Update `commands/mod.rs`**

```rust
pub mod me;
pub mod people;
pub mod projects;
pub mod todos;
pub mod comments;
pub mod ipc;
```

- [ ] **Step 3: Wire commands in `lib.rs`**

Replace the body of `lib.rs` with:

```rust
pub mod commands;
pub mod db;
pub mod error;
pub mod models;
pub mod state;

use commands::ipc;
use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let dir = app.path().app_data_dir().expect("no app data dir");
            let st = AppState::open(dir).map_err(|e| e.to_string())?;
            app.manage(st);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ipc::get_or_create_me,
            ipc::set_my_avatar,
            ipc::list_people,
            ipc::upsert_person,
            ipc::list_projects,
            ipc::create_project,
            ipc::update_project,
            ipc::list_todos,
            ipc::list_todos_for_person,
            ipc::create_todo,
            ipc::update_todo,
            ipc::set_todo_status,
            ipc::delete_todo,
            ipc::add_comment,
            ipc::list_comments,
            ipc::delete_comment,
        ])
        .run(tauri::generate_context!())
        .expect("error while running todoMap");
}
```

- [ ] **Step 4: Verify it compiles**

Run: `cd E:\Work\todoMap\src-tauri && cargo build`
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
cd E:\Work\todoMap && git add -A && git commit -m "feat(tauri): expose ipc commands for all CRUD operations"
```

---

## Phase 2 — Frontend types and API wrappers

### Task 2.1: TypeScript types and API wrappers

**Files:**
- Create: `E:\Work\todoMap\src\types.ts`
- Create: `E:\Work\todoMap\src\api.ts`

- [ ] **Step 1: Create `src/types.ts`**

```typescript
export interface Person {
  id: number;
  name: string;
  avatar_path: string | null;
  is_me: boolean;
  created_at: string;
}

export interface Project {
  id: number;
  name: string;
  color: string;
  archived: boolean;
  created_at: string;
}

export type TodoStatus = "pending" | "in_progress" | "done" | "blocked";

export interface Todo {
  id: number;
  title: string;
  description: string | null;
  status: TodoStatus;
  priority: number;
  due_date: string | null;
  tags: string | null;
  project_id: number;
  from_person_id: number;
  to_person_id: number;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: number;
  todo_id: number;
  author_id: number;
  body: string;
  created_at: string;
}
```

- [ ] **Step 2: Create `src/api.ts`**

```typescript
import { invoke } from "@tauri-apps/api/core";
import type { Comment, Person, Project, Todo, TodoStatus } from "./types";

export const api = {
  // me
  getOrCreateMe: (name: string, avatar_path: string | null) =>
    invoke<Person>("get_or_create_me", { name, avatarPath: avatar_path }),
  setMyAvatar: (avatar_path: string | null) =>
    invoke<void>("set_my_avatar", { avatarPath: avatar_path }),

  // people
  listPeople: () => invoke<Person[]>("list_people"),
  upsertPerson: (name: string, avatar_path: string | null) =>
    invoke<Person>("upsert_person", { name, avatarPath: avatar_path }),

  // projects
  listProjects: (include_archived: boolean) =>
    invoke<Project[]>("list_projects", { includeArchived: include_archived }),
  createProject: (name: string, color: string) =>
    invoke<Project>("create_project", { name, color }),
  updateProject: (
    id: number,
    name: string | null,
    color: string | null,
    archived: boolean | null,
  ) => invoke<Project>("update_project", { id, name, color, archived }),

  // todos
  listTodos: () => invoke<Todo[]>("list_todos"),
  listTodosForPerson: (person_id: number) =>
    invoke<Todo[]>("list_todos_for_person", { personId: person_id }),
  createTodo: (input: {
    title: string;
    description: string | null;
    priority: number;
    due_date: string | null;
    tags: string | null;
    project_id: number;
    from_person_id: number;
    to_person_id: number;
  }) =>
    invoke<Todo>("create_todo", {
      title: input.title,
      description: input.description,
      priority: input.priority,
      dueDate: input.due_date,
      tags: input.tags,
      projectId: input.project_id,
      fromPersonId: input.from_person_id,
      toPersonId: input.to_person_id,
    }),
  updateTodo: (input: {
    id: number;
    title?: string;
    description?: string;
    status?: TodoStatus;
    priority?: number;
    project_id?: number;
    from_person_id?: number;
    to_person_id?: number;
  }) =>
    invoke<Todo>("update_todo", {
      id: input.id,
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      projectId: input.project_id,
      fromPersonId: input.from_person_id,
      toPersonId: input.to_person_id,
    }),
  setTodoStatus: (id: number, status: TodoStatus) =>
    invoke<Todo>("set_todo_status", { id, status }),
  deleteTodo: (id: number) => invoke<void>("delete_todo", { id }),

  // comments
  addComment: (todo_id: number, author_id: number, body: string) =>
    invoke<Comment>("add_comment", { todoId: todo_id, authorId: author_id, body }),
  listComments: (todo_id: number) =>
    invoke<Comment[]>("list_comments", { todoId: todo_id }),
  deleteComment: (id: number) => invoke<void>("delete_comment", { id }),
};
```

- [ ] **Step 3: Type-check the frontend**

Run: `cd E:\Work\todoMap && npm run build`
Expected: success.

- [ ] **Step 4: Commit**

```bash
cd E:\Work\todoMap && git add -A && git commit -m "feat(web): add TS types and api wrappers"
```

---

## Phase 3 — Graph layout and edge computation

### Task 3.1: Force-directed layout with "me" pinned

**Files:**
- Create: `E:\Work\todoMap\src\graph\layout.ts`
- Create: `E:\Work\todoMap\src\graph\layout.test.ts`

- [ ] **Step 1: Create the test**

```typescript
import { describe, it, expect } from "vitest";
import { layoutGraph } from "./layout";

describe("layoutGraph", () => {
  it("places 'me' at the origin", () => {
    const positions = layoutGraph({
      meId: 1,
      people: [
        { id: 1, name: "我" },
        { id: 2, name: "小王" },
      ],
      todos: [{ from_person_id: 1, to_person_id: 2 }],
    });
    expect(positions.get(1)).toEqual({ x: 0, y: 0 });
    expect(positions.get(2)).not.toEqual({ x: 0, y: 0 });
  });

  it("returns a position for every person", () => {
    const positions = layoutGraph({
      meId: 1,
      people: [
        { id: 1, name: "我" },
        { id: 2, name: "A" },
        { id: 3, name: "B" },
        { id: 4, name: "C" },
      ],
      todos: [
        { from_person_id: 1, to_person_id: 2 },
        { from_person_id: 1, to_person_id: 3 },
        { from_person_id: 1, to_person_id: 4 },
      ],
    });
    expect(positions.size).toBe(4);
  });
});
```

- [ ] **Step 2: Create the layout module**

```typescript
export interface LayoutPerson {
  id: number;
  name: string;
}
export interface LayoutTodo {
  from_person_id: number;
  to_person_id: number;
}
export interface LayoutInput {
  meId: number;
  people: LayoutPerson[];
  todos: LayoutTodo[];
}
export interface Point { x: number; y: number; }

const RADIUS = 220;
const ITERATIONS = 200;

export function layoutGraph(input: LayoutInput): Map<number, Point> {
  const ids = input.people.map((p) => p.id);
  if (!ids.includes(input.meId)) {
    throw new Error(`meId ${input.meId} not in people list`);
  }
  const others = ids.filter((id) => id !== input.meId);

  const pos = new Map<number, Point>();
  pos.set(input.meId, { x: 0, y: 0 });
  others.forEach((id, i) => {
    const angle = (i / others.length) * Math.PI * 2;
    pos.set(id, { x: Math.cos(angle) * RADIUS, y: Math.sin(angle) * RADIUS });
  });

  const edges = input.todos.map((t) => [t.from_person_id, t.to_person_id] as const);

  for (let iter = 0; iter < ITERATIONS; iter++) {
    for (const id of others) {
      const current = pos.get(id)!;
      const best = bestAngle(id, current, pos, edges);
      pos.set(id, best);
    }
  }
  return pos;
}

function bestAngle(
  id: number,
  current: Point,
  pos: Map<number, Point>,
  edges: readonly (readonly [number, number])[],
): Point {
  const candidates = [-0.3, -0.1, 0, 0.1, 0.3].map((da) => rotate(current, da));
  let best = current;
  let bestScore = Infinity;
  for (const c of candidates) {
    pos.set(id, c);
    const s = crossings(edges, pos);
    if (s < bestScore) { bestScore = s; best = c; }
  }
  pos.set(id, best);
  return best;
}

function rotate(p: Point, dAngle: number): Point {
  const r = Math.hypot(p.x, p.y);
  const a = Math.atan2(p.y, p.x) + dAngle;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r };
}

function crossings(edges: readonly (readonly [number, number])[], pos: Map<number, Point>): number {
  let n = 0;
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      if (segmentsCross(
        pos.get(edges[i][0])!, pos.get(edges[i][1])!,
        pos.get(edges[j][0])!, pos.get(edges[j][1])!,
      )) n++;
    }
  }
  return n;
}

function segmentsCross(a: Point, b: Point, c: Point, d: Point): boolean {
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

function orient(a: Point, b: Point, c: Point): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}
```

- [ ] **Step 3: Run the test**

Run: `cd E:\Work\todoMap && npm test -- --run layout`
Expected: `2 passed`.

- [ ] **Step 4: Commit**

```bash
cd E:\Work\todoMap && git add -A && git commit -m "feat(web): force-directed layout with 'me' pinned at center"
```

### Task 3.2: Edge list builder (one edge per todo, with arc routing)

**Files:**
- Create: `E:\Work\todoMap\src\graph\edges.ts`
- Create: `E:\Work\todoMap\src\graph\edges.test.ts`

- [ ] **Step 1: Create the test**

```typescript
import { describe, it, expect } from "vitest";
import { buildEdges } from "./edges";
import type { Todo, Project } from "../types";

const proj = (id: number, color: string): Project => ({
  id, name: `P${id}`, color, archived: false, created_at: "",
});

const todo = (id: number, from: number, to: number, project_id: number, status: Todo["status"] = "pending"): Todo => ({
  id, title: `T${id}`, description: null, status, priority: 0,
  due_date: null, tags: null, project_id, from_person_id: from,
  to_person_id: to, created_at: "", updated_at: "",
});

describe("buildEdges", () => {
  it("returns one edge per todo", () => {
    const edges = buildEdges(
      [todo(1, 1, 2, 10), todo(2, 1, 2, 10), todo(3, 1, 3, 11)],
      [proj(10, "#3aa856"), proj(11, "#5b8def")],
    );
    expect(edges).toHaveLength(3);
  });

  it("uses dashed style for done todos", () => {
    const edges = buildEdges(
      [todo(1, 1, 2, 10, "done")],
      [proj(10, "#3aa856")],
    );
    expect(edges[0].dashed).toBe(true);
  });

  it("uses the project color", () => {
    const edges = buildEdges(
      [todo(1, 1, 2, 10, "pending")],
      [proj(10, "#ff00ff")],
    );
    expect(edges[0].color).toBe("#ff00ff");
  });
});
```

- [ ] **Step 2: Create the edges module**

```typescript
import type { Project, Todo, TodoStatus } from "../types";

export interface EdgeData {
  id: number;            // todo id, used as React Flow edge id
  todo_id: number;
  source: number;        // person id
  target: number;        // person id
  color: string;
  dashed: boolean;
  arcIndex: number;      // index among same-pair edges, used for arc routing
  arcCount: number;
  status: TodoStatus;
}

export function buildEdges(todos: Todo[], projects: Project[]): EdgeData[] {
  const colorByProject = new Map(projects.map((p) => [p.id, p.color]));
  const pairCounts = new Map<string, number>();
  const pairIndices = new Map<string, number>();
  const out: EdgeData[] = [];

  for (const t of todos) {
    const key = pairKey(t.from_person_id, t.to_person_id);
    const count = (pairCounts.get(key) ?? 0) + 1;
    pairCounts.set(key, count);
  }

  for (const t of todos) {
    const key = pairKey(t.from_person_id, t.to_person_id);
    const idx = pairIndices.get(key) ?? 0;
    pairIndices.set(key, idx + 1);
    out.push({
      id: t.id,
      todo_id: t.id,
      source: t.from_person_id,
      target: t.to_person_id,
      color: colorByProject.get(t.project_id) ?? "#888888",
      dashed: t.status === "done",
      arcIndex: idx,
      arcCount: pairCounts.get(key) ?? 1,
      status: t.status,
    });
  }
  return out;
}

function pairKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}
```

- [ ] **Step 3: Run the test**

Run: `cd E:\Work\todoMap && npm test -- --run edges`
Expected: `3 passed`.

- [ ] **Step 4: Commit**

```bash
cd E:\Work\todoMap && git add -A && git commit -m "feat(web): build per-todo edges with arc routing and dashed=done"
```

---

## Phase 4 — GraphView component

### Task 4.1: GraphView (React Flow) with custom node and arc edges

**Files:**
- Create: `E:\Work\todoMap\src\components\GraphView.tsx`

- [ ] **Step 1: Create the component**

```typescript
import { useMemo, useState } from "react";
import ReactFlow, { Background, Controls, MarkerType, type Edge, type Node } from "reactflow";
import "reactflow/dist/style.css";
import { layoutGraph } from "../graph/layout";
import { buildEdges } from "../graph/edges";
import type { Person, Project, Todo } from "../types";

interface Props {
  me: Person;
  people: Person[];
  projects: Project[];
  todos: Todo[];
  selectedId: number | null;
  onSelectNode: (personId: number | null) => void;
  onSelectEdge: (todoId: number) => void;
}

export function GraphView(props: Props) {
  const { me, people, projects, todos, onSelectNode, onSelectEdge } = props;
  const [menu, setMenu] = useState<{ kind: "node" | "edge"; x: number; y: number; id: number } | null>(null);

  const positions = useMemo(
    () =>
      layoutGraph({
        meId: me.id,
        people: people.map((p) => ({ id: p.id, name: p.name })),
        todos: todos.map((t) => ({ from_person_id: t.from_person_id, to_person_id: t.to_person_id })),
      }),
    [me.id, people, todos],
  );

  const colorByPerson = useMemo(() => {
    const m = new Map<number, string>();
    const recent = new Map<number, { project_id: number; ts: string }>();
    const projColor = new Map(projects.map((p) => [p.id, p.color]));
    for (const t of todos) {
      const cur = recent.get(t.to_person_id);
      if (!cur || cur.ts < t.updated_at) recent.set(t.to_person_id, { project_id: t.project_id, ts: t.updated_at });
      const cur2 = recent.get(t.from_person_id);
      if (!cur2 || cur2.ts < t.updated_at) recent.set(t.from_person_id, { project_id: t.project_id, ts: t.updated_at });
    }
    for (const [pid, info] of recent) {
      const c = projColor.get(info.project_id);
      if (c) m.set(pid, c);
    }
    m.set(me.id, "#3a8def");
    return m;
  }, [people, projects, todos, me.id]);

  const nodes: Node[] = useMemo(
    () =>
      people.map((p) => {
        const pos = positions.get(p.id) ?? { x: 0, y: 0 };
        const color = colorByPerson.get(p.id) ?? "#888888";
        return {
          id: String(p.id),
          position: pos,
          data: { label: p.name, isMe: p.is_me, color },
          style: {
            background: p.is_me ? "#3a8def" : "#262c3a",
            color: "#eee",
            border: `2px solid ${color}`,
            borderRadius: "50%",
            width: 60,
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: p.is_me ? 700 : 400,
          },
        };
      }),
    [people, positions, colorByPerson],
  );

  const edges: Edge[] = useMemo(() => {
    const built = buildEdges(todos, projects);
    return built.map((e) => {
      const offset = e.arcCount > 1 ? (e.arcIndex - (e.arcCount - 1) / 2) * 30 : 0;
      return {
        id: String(e.id),
        source: String(e.source),
        target: String(e.target),
        type: "default",
        animated: e.status === "in_progress",
        style: {
          stroke: e.color,
          strokeWidth: 1,
          strokeDasharray: e.dashed ? "3 3" : undefined,
          opacity: e.dashed ? 0.4 : 1,
        },
        pathOptions: { curvature: offset / 200 },
        markerEnd: { type: MarkerType.ArrowClosed, color: e.color },
        data: { todo_id: e.todo_id },
      };
    });
  }, [todos, projects]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        onNodeClick={(_, n) => onSelectNode(Number(n.id))}
        onEdgeClick={(_, e) => onSelectEdge(Number(e.id))}
        onNodeContextMenu={(e, n) => { e.preventDefault(); setMenu({ kind: "node", x: e.clientX, y: e.clientY, id: Number(n.id) }); }}
        onEdgeContextMenu={(e, ed) => { e.preventDefault(); setMenu({ kind: "edge", x: e.clientX, y: e.clientY, id: Number(ed.id) }); }}
        onPaneClick={() => { setMenu(null); onSelectNode(null); }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1a1f2e" />
        <Controls />
      </ReactFlow>
      {menu && (
        <div className="ctxmenu" style={{ left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()}>
          {menu.kind === "node" && (
            <button onClick={() => { onSelectNode(menu.id); setMenu(null); }}>查看详情</button>
          )}
          {menu.kind === "edge" && (
            <button onClick={() => { onSelectEdge(menu.id); setMenu(null); }}>打开 todo</button>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd E:\Work\todoMap && git add -A && git commit -m "feat(web): GraphView with me-centered layout and per-todo edges"
```

---

## Phase 5 — Onboarding + Sidebar + Dialogs

### Task 5.1: OnboardingDialog

**Files:**
- Create: `E:\Work\todoMap\src\components\OnboardingDialog.tsx`

- [ ] **Step 1: Create the file**

```typescript
import { useState } from "react";
import { api } from "../api";
import type { Person } from "../types";

interface Props {
  onCreated: (me: Person) => void;
}

export function OnboardingDialog({ onCreated }: Props) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true); setErr(null);
    try {
      const me = await api.getOrCreateMe(name.trim(), null);
      onCreated(me);
    } catch (e: any) {
      setErr(String(e));
    } finally { setBusy(false); }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>欢迎使用 todoMap</h2>
        <p>先告诉我你的名字,我们就可以开始了。</p>
        <input
          className="input"
          placeholder="你的名字"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          autoFocus
        />
        {err && <div className="error">{err}</div>}
        <div className="modal-actions">
          <button className="primary" onClick={submit} disabled={busy || !name.trim()}>开始</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd E:\Work\todoMap && git add -A && git commit -m "feat(web): OnboardingDialog"
```

### Task 5.2: Sidebar

**Files:**
- Create: `E:\Work\todoMap\src\components\Sidebar.tsx`

- [ ] **Step 1: Create the file**

```typescript
import type { Person, Todo } from "../types";

interface Props {
  me: Person;
  selected: Person | null;
  todos: Todo[];
  people: Person[];
  onOpenTodo: (todoId: number) => void;
}

export function Sidebar({ me, selected, todos, people, onOpenTodo }: Props) {
  const target = selected ?? me;
  const outgoing = todos.filter((t) => t.from_person_id === target.id);
  const incoming = todos.filter((t) => t.to_person_id === target.id);
  const nameOf = (id: number) => people.find((p) => p.id === id)?.name ?? `#${id}`;

  return (
    <aside className="sidebar">
      <div className="person-card">
        <div className="avatar" data-me={target.is_me || undefined}>{target.name.slice(0, 1)}</div>
        <div>
          <div className="name">{target.name}{target.is_me ? " (我)" : ""}</div>
          <div className="meta">{todos.length} 条委托</div>
        </div>
      </div>

      <section>
        <h4>{target.is_me ? "我派出去的" : `${target.name} 派出去的`} · {outgoing.length}</h4>
        {outgoing.length === 0 && <div className="empty">暂无</div>}
        {outgoing.map((t) => (
          <div key={t.id} className={`todo-card status-${t.status}`} onClick={() => onOpenTodo(t.id)}>
            <div className="title">{t.status === "done" ? <s>{t.title}</s> : t.title}</div>
            <div className="meta">→ {nameOf(t.to_person_id)} · {t.status}{t.due_date ? ` · ${t.due_date}` : ""}</div>
          </div>
        ))}
      </section>

      <section>
        <h4>{target.is_me ? "别人派给我的" : `派给 ${target.name} 的`} · {incoming.length}</h4>
        {incoming.length === 0 && <div className="empty">暂无</div>}
        {incoming.map((t) => (
          <div key={t.id} className={`todo-card status-${t.status}`} onClick={() => onOpenTodo(t.id)}>
            <div className="title">{t.status === "done" ? <s>{t.title}</s> : t.title}</div>
            <div className="meta">← {nameOf(t.from_person_id)} · {t.status}{t.due_date ? ` · ${t.due_date}` : ""}</div>
          </div>
        ))}
      </section>
    </aside>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd E:\Work\todoMap && git add -A && git commit -m "feat(web): Sidebar showing selected person's todos"
```

### Task 5.3: NewPersonDialog (helper used from TodoDialog)

**Files:**
- Create: `E:\Work\todoMap\src\components\NewPersonDialog.tsx`

- [ ] **Step 1: Create the file**

```typescript
import { useState } from "react";
import { api } from "../api";
import type { Person } from "../types";

interface Props {
  initialName: string;
  onClose: () => void;
  onCreated: (p: Person) => void;
}

export function NewPersonDialog({ initialName, onClose, onCreated }: Props) {
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true); setErr(null);
    try {
      const p = await api.upsertPerson(name.trim(), null);
      onCreated(p);
    } catch (e: any) { setErr(String(e)); } finally { setBusy(false); }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>新建协作人</h2>
        <label>名字<input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></label>
        {err && <div className="error">{err}</div>}
        <div className="modal-actions">
          <button onClick={onClose}>取消</button>
          <button className="primary" onClick={submit} disabled={busy || !name.trim()}>创建</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd E:\Work\todoMap && git add -A && git commit -m "feat(web): NewPersonDialog"
```

### Task 5.4: TodoDialog (add/edit)

**Files:**
- Create: `E:\Work\todoMap\src\components\TodoDialog.tsx`

- [ ] **Step 1: Create the file**

```typescript
import { useEffect, useState } from "react";
import { api } from "../api";
import type { Person, Project, Todo, TodoStatus } from "../types";
import NewPersonDialog from "./NewPersonDialog";

interface Props {
  me: Person;
  people: Person[];
  projects: Project[];
  editing: Todo | null;
  prefill?: { from?: number; to?: number; project_id?: number };
  onClose: () => void;
  onSaved: (t: Todo) => void;
  onPersonCreated?: (p: Person) => Promise<void>;
}

export function TodoDialog({ me, people, projects, editing, prefill, onClose, onSaved, onPersonCreated }: Props) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [fromId, setFromId] = useState<number>(editing?.from_person_id ?? prefill?.from ?? me.id);
  const [toId, setToId] = useState<number>(editing?.to_person_id ?? prefill?.to ?? (people.find((p) => p.id !== me.id)?.id ?? me.id));
  const [projectId, setProjectId] = useState<number | null>(editing?.project_id ?? prefill?.project_id ?? projects[0]?.id ?? null);
  const [status, setStatus] = useState<TodoStatus>(editing?.status ?? "pending");
  const [priority, setPriority] = useState<number>(editing?.priority ?? 0);
  const [dueDate, setDueDate] = useState<string>(editing?.due_date ?? "");
  const [tags, setTags] = useState<string>(editing?.tags ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showNewPerson, setShowNewPerson] = useState(false);

  useEffect(() => {
    if (!projectId && projects.length > 0) setProjectId(projects[0].id);
  }, [projects, projectId]);

  const submit = async () => {
    if (!title.trim() || !projectId) return;
    setBusy(true); setErr(null);
    try {
      const t = editing
        ? await api.updateTodo({
            id: editing.id,
            title: title.trim(),
            description: description.trim() || null,
            status, priority,
            project_id: projectId,
            from_person_id: fromId,
            to_person_id: toId,
          })
        : await api.createTodo({
            title: title.trim(),
            description: description.trim() || null,
            priority,
            due_date: dueDate || null,
            tags: tags.trim() || null,
            project_id: projectId,
            from_person_id: fromId,
            to_person_id: toId,
          });
      onSaved(t);
    } catch (e: any) { setErr(String(e)); } finally { setBusy(false); }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>{editing ? "编辑委托" : "新增委托"}</h2>
        <label>标题<input className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus /></label>
        <label>描述<textarea className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
        <div className="row">
          <label>委托方
            <select className="input" value={fromId} onChange={(e) => setFromId(Number(e.target.value))}>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}{p.is_me ? " (我)" : ""}</option>)}
            </select>
          </label>
          <label>接收方
            <select className="input" value={toId} onChange={(e) => setToId(Number(e.target.value))}>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}{p.is_me ? " (我)" : ""}</option>)}
            </select>
            <button type="button" className="ghost" style={{ marginTop: 4 }} onClick={() => setShowNewPerson(true)}>+ 新建协作人</button>
          </label>
        </div>
        <label>项目
          <select className="input" value={projectId ?? ""} onChange={(e) => setProjectId(Number(e.target.value))}>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <div className="row">
          <label>状态
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as TodoStatus)}>
              <option value="pending">待办</option>
              <option value="in_progress">进行中</option>
              <option value="done">已完成</option>
              <option value="blocked">卡住</option>
            </select>
          </label>
          <label>优先级
            <select className="input" value={priority} onChange={(e) => setPriority(Number(e.target.value))}>
              <option value={0}>无</option>
              <option value={1}>P1</option>
              <option value={2}>P2</option>
              <option value={3}>P3</option>
            </select>
          </label>
          <label>截止日
            <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
        </div>
        <label>标签 (逗号分隔)<input className="input" value={tags} onChange={(e) => setTags(e.target.value)} /></label>
        {err && <div className="error">{err}</div>}
        <div className="modal-actions">
          <button onClick={onClose}>取消</button>
          <button className="primary" onClick={submit} disabled={busy || !title.trim() || !projectId}>
            {editing ? "保存" : "创建"}
          </button>
        </div>
        {showNewPerson && (
          <NewPersonDialog
            initialName=""
            onClose={() => setShowNewPerson(false)}
            onCreated={async (p) => {
              setShowNewPerson(false);
              if (onPersonCreated) await onPersonCreated(p);
              setToId(p.id);
            }}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd E:\Work\todoMap && git add -A && git commit -m "feat(web): TodoDialog for add/edit"
```

### Task 5.5: ProjectDialog (add/edit)

**Files:**
- Create: `E:\Work\todoMap\src\components\ProjectDialog.tsx`

- [ ] **Step 1: Create the file**

```typescript
import { useState } from "react";
import { api } from "../api";
import type { Project } from "../types";

interface Props {
  editing?: Project | null;
  onClose: () => void;
  onSaved: (p: Project) => void;
}

const PALETTE = ["#3aa856", "#d97b3a", "#5b8def", "#c45ec4", "#e8c547", "#5ad1ce", "#e85a5a"];

export function ProjectDialog({ editing, onClose, onSaved }: Props) {
  const [name, setName] = useState(editing?.name ?? "");
  const [color, setColor] = useState(editing?.color ?? PALETTE[0]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true); setErr(null);
    try {
      const p = editing
        ? await api.updateProject(editing.id, name.trim(), color, null)
        : await api.createProject(name.trim(), color);
      onSaved(p);
    } catch (e: any) { setErr(String(e)); } finally { setBusy(false); }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>{editing ? "编辑项目" : "新建项目"}</h2>
        <label>名称<input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></label>
        <div className="palette">
          {PALETTE.map((c) => (
            <button
              key={c}
              className={`swatch ${c === color ? "selected" : ""}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={`color ${c}`}
            />
          ))}
        </div>
        {err && <div className="error">{err}</div>}
        <div className="modal-actions">
          <button onClick={onClose}>取消</button>
          <button className="primary" onClick={submit} disabled={busy || !name.trim()}>
            {editing ? "保存" : "创建"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd E:\Work\todoMap && git add -A && git commit -m "feat(web): ProjectDialog for add/edit"
```

### Task 5.6: EmptyState

**Files:**
- Create: `E:\Work\todoMap\src\components\EmptyState.tsx`

- [ ] **Step 1: Create the file**

```typescript
interface Props {
  title: string;
  hint?: string;
  onAction?: () => void;
  actionLabel?: string;
}

export function EmptyState({ title, hint, onAction, actionLabel }: Props) {
  return (
    <div className="empty-state">
      <div className="title">{title}</div>
      {hint && <div className="hint">{hint}</div>}
      {onAction && actionLabel && (
        <button className="primary" onClick={onAction}>{actionLabel}</button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd E:\Work\todoMap && git add -A && git commit -m "feat(web): EmptyState component"
```

---

## Phase 6 — Top-level App wiring + styles

### Task 6.1: App.tsx wires everything together

**Files:**
- Modify: `E:\Work\todoMap\src\App.tsx`
- Modify: `E:\Work\todoMap\src\styles.css`

- [ ] **Step 1: Replace `src/App.tsx`**

```typescript
import { useEffect, useState } from "react";
import { api } from "./api";
import type { Person, Project, Todo } from "./types";
import { GraphView } from "./components/GraphView";
import { Sidebar } from "./components/Sidebar";
import { OnboardingDialog } from "./components/OnboardingDialog";
import { TodoDialog } from "./components/TodoDialog";
import { ProjectDialog } from "./components/ProjectDialog";
import { EmptyState } from "./components/EmptyState";

export default function App() {
  const [me, setMe] = useState<Person | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [showNewTodo, setShowNewTodo] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const ps = await api.listPeople();
      const m = ps.find((p) => p.is_me);
      if (m) {
        setMe(m);
        setPeople(ps);
        setProjects(await api.listProjects(false));
        setTodos(await api.listTodos());
      }
      setLoaded(true);
    })();
  }, []);

  const refresh = async () => {
    const ps = await api.listPeople();
    setPeople(ps);
    setProjects(await api.listProjects(false));
    setTodos(await api.listTodos());
  };

  const onMeCreated = async (m: Person) => {
    setMe(m);
    await refresh();
  };

  if (!loaded) return <div className="app">Loading…</div>;
  if (!me) return <OnboardingDialog onCreated={onMeCreated} />;

  const selectedPerson = selectedPersonId ? people.find((p) => p.id === selectedPersonId) ?? null : null;
  const filteredTodos = todos.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return t.title.toLowerCase().includes(q);
  });

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">todoMap</div>
        <button onClick={() => setShowNewProject(true)}>项目 ({projects.length})</button>
        <input className="search" placeholder="搜索:人 / 项目 / todo" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="primary" onClick={() => setShowNewTodo(true)} disabled={projects.length === 0}>+ 新增委托</button>
      </header>

      <div className="body">
        <main className="graph">
          {people.length <= 1 && projects.length === 0 ? (
            <EmptyState
              title="从第一个项目开始"
              hint="todoMap 让你以图的方式看到和协作人之间的委托关系。先建一个项目,然后给协作人派活。"
              onAction={() => setShowNewProject(true)}
              actionLabel="+ 新建项目"
            />
          ) : (
            <GraphView
              me={me}
              people={people}
              projects={projects}
              todos={filteredTodos}
              selectedId={selectedPersonId}
              onSelectNode={setSelectedPersonId}
              onSelectEdge={(id) => { const t = todos.find((x) => x.id === id); if (t) setEditingTodo(t); }}
            />
          )}
        </main>
        <Sidebar
          me={me}
          selected={selectedPerson}
          todos={todos}
          people={people}
          onOpenTodo={(id) => { const t = todos.find((x) => x.id === id); if (t) setEditingTodo(t); }}
        />
      </div>

      <footer className="statusbar">
        <span>● {projects.length} 个项目</span>
        <span>● {people.length} 个人</span>
        <span>● {todos.length} 条委托 · {todos.filter((t) => t.status === "in_progress").length} 进行中</span>
        <span className="grow"></span>
        <button className="ghost" onClick={async () => {
          const json = await api.exportJson();
          const blob = new Blob([json], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = `todomap-${new Date().toISOString().slice(0,10)}.json`;
          a.click();
          URL.revokeObjectURL(url);
        }}>导出 JSON</button>
      </footer>

      {showNewTodo && projects.length > 0 && (
        <TodoDialog
          me={me} people={people} projects={projects}
          editing={null}
          onClose={() => setShowNewTodo(false)}
          onSaved={async () => { setShowNewTodo(false); await refresh(); }}
          onPersonCreated={async () => { await refresh(); }}
        />
      )}

      {editingTodo && (
        <TodoDialog
          me={me} people={people} projects={projects}
          editing={editingTodo}
          onClose={() => setEditingTodo(null)}
          onSaved={async () => { setEditingTodo(null); await refresh(); }}
          onPersonCreated={async () => { await refresh(); }}
        />
      )}

      {showNewProject && (
        <ProjectDialog
          onClose={() => setShowNewProject(false)}
          onSaved={async () => { setShowNewProject(false); await refresh(); }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Replace `src/styles.css`**

```css
html, body, #root { height: 100%; margin: 0; }
body { background: #0f1320; color: #eee; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
* { box-sizing: border-box; }

.app { display: flex; flex-direction: column; height: 100vh; background: #0f1320; }

.topbar {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 16px; background: #1a1f2e; border-bottom: 1px solid #2a3140;
}
.topbar .brand { font-size: 14px; font-weight: 700; color: #eee; margin-right: 4px; }
.topbar button { background: #262c3a; color: #ccc; border: 1px solid #2a3140; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; }
.topbar button.ghost { background: transparent; }
.topbar button.primary { background: #3aa856; color: #fff; border-color: #3aa856; }
.topbar button:disabled { opacity: 0.5; cursor: not-allowed; }
.topbar .search { flex: 1; background: #262c3a; border: 1px solid #2a3140; color: #eee; padding: 5px 10px; border-radius: 4px; font-size: 12px; }

.body { flex: 1; display: flex; min-height: 0; }
.graph { flex: 2; min-width: 0; }
.sidebar { flex: 1; background: #161a26; border-left: 1px solid #2a3140; padding: 12px; overflow-y: auto; min-width: 280px; max-width: 420px; }

.statusbar {
  display: flex; align-items: center; gap: 14px; padding: 6px 16px; background: #1a1f2e;
  border-top: 1px solid #2a3140; color: #888; font-size: 11px;
}
.statusbar .grow { flex: 1; }
.statusbar button { background: #262c3a; color: #ccc; border: 1px solid #2a3140; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; }

.person-card { display: flex; gap: 10px; align-items: center; padding-bottom: 10px; border-bottom: 1px solid #2a3140; margin-bottom: 10px; }
.avatar { width: 36px; height: 36px; border-radius: 50%; background: #3a3f4d; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; }
.avatar[data-me] { background: #3a8def; }
.name { font-size: 13px; font-weight: 600; }
.meta { color: #888; font-size: 10px; }

.sidebar h4 { color: #888; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin: 12px 0 6px; }
.todo-card { background: #1a1f2e; padding: 6px 8px; border-radius: 3px; border-left: 3px solid #555; margin-bottom: 4px; cursor: pointer; }
.todo-card:hover { background: #232838; }
.todo-card .title { font-size: 12px; color: #eee; }
.todo-card .meta { font-size: 10px; color: #888; margin-top: 2px; }
.todo-card.status-done { border-left-color: #2a6e3a; opacity: 0.65; }
.todo-card.status-in_progress { border-left-color: #3aa856; }
.todo-card.status-blocked { border-left-color: #e85a5a; }
.empty { color: #555; font-size: 11px; padding: 4px 0; }

.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { background: #1a1f2e; border: 1px solid #2a3140; border-radius: 6px; padding: 18px; min-width: 380px; max-width: 520px; }
.modal h2 { margin: 0 0 12px; font-size: 15px; }
.modal label { display: block; font-size: 11px; color: #aaa; margin-bottom: 10px; }
.modal .row { display: flex; gap: 10px; }
.modal .row label { flex: 1; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
.modal-actions button { background: #262c3a; color: #ccc; border: 1px solid #2a3140; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; }
.modal-actions button.primary { background: #3aa856; color: #fff; border-color: #3aa856; }
.modal-actions button:disabled { opacity: 0.5; cursor: not-allowed; }

.input { width: 100%; background: #0f1320; border: 1px solid #2a3140; color: #eee; padding: 6px 8px; border-radius: 3px; font-size: 12px; margin-top: 3px; font-family: inherit; }
select.input { appearance: auto; }
textarea.input { resize: vertical; }

.error { color: #ff8888; font-size: 11px; margin-top: 6px; }

.palette { display: flex; gap: 6px; margin: 10px 0; }
.swatch { width: 26px; height: 26px; border-radius: 4px; border: 2px solid transparent; cursor: pointer; }
.swatch.selected { border-color: #fff; }

.ctxmenu {
  position: fixed; z-index: 200; background: #1a1f2e; border: 1px solid #2a3140;
  border-radius: 4px; padding: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}
.ctxmenu button { display: block; width: 100%; text-align: left; background: transparent; color: #eee; border: 0; padding: 6px 10px; font-size: 12px; cursor: pointer; }
.ctxmenu button:hover { background: #2a3140; }

.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #888; padding: 32px; gap: 12px; }
.empty-state .title { font-size: 14px; color: #ccc; }
.empty-state .hint { font-size: 12px; max-width: 360px; text-align: center; line-height: 1.6; }
.empty-state button { background: #3aa856; color: #fff; border: 0; padding: 6px 14px; border-radius: 4px; cursor: pointer; font-size: 12px; }
```

- [ ] **Step 3: Type-check + build**

Run: `cd E:\Work\todoMap && npm run build`
Expected: success.

- [ ] **Step 4: Commit**

```bash
cd E:\Work\todoMap && git add -A && git commit -m "feat(web): wire App with GraphView, Sidebar, dialogs, styles"
```

### Task 6.2: Add an error boundary in main.tsx

**Files:**
- Modify: `E:\Work\todoMap\src\main.tsx`

- [ ] **Step 1: Replace `src/main.tsx`**

```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) { return { err }; }
  componentDidCatch(err: Error) { console.error(err); }
  render() {
    if (this.state.err) {
      return (
        <div style={{ padding: 24, color: "#ff8888", background: "#0f1320", height: "100%" }}>
          <h2>出错了</h2>
          <pre>{this.state.err.message}</pre>
          <button onClick={() => location.reload()}>重新加载</button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
```

- [ ] **Step 2: Build**

Run: `cd E:\Work\todoMap && npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
cd E:\Work\todoMap && git add -A && git commit -m "feat(web): add error boundary"
```

---

## Phase 7 — Export/import + final smoke

### Task 7.1: `export.rs` — JSON export/import

**Files:**
- Create: `E:\Work\todoMap\src-tauri\src\commands\export.rs`
- Modify: `E:\Work\todoMap\src-tauri\src\commands\mod.rs`
- Modify: `E:\Work\todoMap\src-tauri\src\commands\ipc.rs`
- Modify: `E:\Work\todoMap\src-tauri\src\lib.rs`
- Create: `E:\Work\todoMap\src-tauri\tests\export.rs`

- [ ] **Step 1: Create `tests/export.rs`**

```rust
use tempfile::tempdir;
use todomap_lib::state::AppState;

#[test]
fn export_then_import_roundtrip() {
    let dir = tempdir().unwrap();
    let st = AppState::open(dir.path().to_path_buf()).unwrap();
    todomap_lib::commands::me::get_or_create_me(&st, "我".into(), None).unwrap();
    let other = todomap_lib::commands::people::upsert(&st, "小王".into(), None).unwrap();
    let proj = todomap_lib::commands::projects::create(&st, "P".into(), "#3aa856".into()).unwrap();
    let me = todomap_lib::commands::people::list(&st).unwrap().into_iter().find(|p| p.is_me).unwrap();
    todomap_lib::commands::todos::create(
        &st, "x".into(), None, 0, None, None, proj.id, me.id, other.id,
    ).unwrap();

    let json = todomap_lib::commands::export::export_json(&st).unwrap();
    assert!(json.contains("people"));
    assert!(json.contains("小王"));

    let dir2 = tempdir().unwrap();
    let st2 = AppState::open(dir2.path().to_path_buf()).unwrap();
    todomap_lib::commands::export::import_json(&st2, &json, false).unwrap();
    let people2 = todomap_lib::commands::people::list(&st2).unwrap();
    let todos2 = todomap_lib::commands::todos::list_all(&st2).unwrap();
    assert!(people2.iter().any(|p| p.name == "小王"));
    assert_eq!(todos2.len(), 1);
}
```

- [ ] **Step 2: Create `commands/export.rs`**

```rust
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
            r.get::<_, i64>(0)?, r.get::<_, String>(1)?, r.get::<_, Option<String>>(2)?,
            r.get::<_, i64>(3)? != 0, r.get::<_, String>(4)?,
        )))?;
        rows.filter_map(|x| x.ok()).map(|(id, name, avatar_path, is_me, created_at)| {
            crate::models::Person { id, name, avatar_path, is_me, created_at }
        }).collect::<Vec<_>>()
    };
    let projects = {
        let mut s = conn.prepare("SELECT id, name, color, archived, created_at FROM projects")?;
        let rows = s.query_map([], |r| Ok((
            r.get::<_, i64>(0)?, r.get::<_, String>(1)?, r.get::<_, String>(2)?,
            r.get::<_, i64>(3)? != 0, r.get::<_, String>(4)?,
        )))?;
        rows.filter_map(|x| x.ok()).map(|(id, name, color, archived, created_at)| {
            crate::models::Project { id, name, color, archived, created_at }
        }).collect::<Vec<_>>()
    };
    let todos = {
        let mut s = conn.prepare(
            "SELECT id, title, description, status, priority, due_date, tags,
                    project_id, from_person_id, to_person_id, created_at, updated_at
             FROM todos",
        )?;
        let rows = s.query_map([], |r| Ok(crate::models::Todo {
            id: r.get(0)?, title: r.get(1)?, description: r.get(2)?, status: r.get(3)?,
            priority: r.get(4)?, due_date: r.get(5)?, tags: r.get(6)?,
            project_id: r.get(7)?, from_person_id: r.get(8)?, to_person_id: r.get(9)?,
            created_at: r.get(10)?, updated_at: r.get(11)?,
        }))?;
        rows.filter_map(|x| x.ok()).collect::<Vec<_>>()
    };
    let comments = {
        let mut s = conn.prepare("SELECT id, todo_id, author_id, body, created_at FROM comments")?;
        let rows = s.query_map([], |r| Ok(crate::models::Comment {
            id: r.get(0)?, todo_id: r.get(1)?, author_id: r.get(2)?,
            body: r.get(3)?, created_at: r.get(4)?,
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
    let mut conn = st.conn.lock().unwrap();
    let tx = conn.transaction()?;

    if !merge {
        tx.execute("DELETE FROM comments", [])?;
        tx.execute("DELETE FROM todos", [])?;
        tx.execute("DELETE FROM projects", [])?;
        tx.execute("DELETE FROM people", [])?;
    }

    for p in &root.people {
        tx.execute(
            "INSERT OR IGNORE INTO people (id, name, avatar_path, is_me, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![p.id, p.name, p.avatar_path, p.is_me as i64, p.created_at],
        )?;
    }
    for p in &root.projects {
        tx.execute(
            "INSERT OR IGNORE INTO projects (id, name, color, archived, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![p.id, p.name, p.color, p.archived as i64, p.created_at],
        )?;
    }
    for t in &root.todos {
        tx.execute(
            "INSERT OR IGNORE INTO todos
                (id, title, description, status, priority, due_date, tags,
                 project_id, from_person_id, to_person_id, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                t.id, t.title, t.description, t.status, t.priority, t.due_date, t.tags,
                t.project_id, t.from_person_id, t.to_person_id, t.created_at, t.updated_at
            ],
        )?;
    }
    for c in &root.comments {
        tx.execute(
            "INSERT OR IGNORE INTO comments (id, todo_id, author_id, body, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![c.id, c.todo_id, c.author_id, c.body, c.created_at],
        )?;
    }

    tx.commit()?;
    Ok(())
}
```

- [ ] **Step 3: Update `commands/mod.rs`**

```rust
pub mod me;
pub mod people;
pub mod projects;
pub mod todos;
pub mod comments;
pub mod export;
pub mod ipc;
```

- [ ] **Step 4: Append IPC wrappers in `commands/ipc.rs`**

Add at the end of the file:

```rust
#[tauri::command]
pub fn export_json(st: State<'_, AppState>) -> AppResult<String> {
    super::export::export_json(&st)
}

#[tauri::command]
pub fn import_json(
    st: State<'_, AppState>,
    json: String,
    merge: bool,
) -> AppResult<()> {
    super::export::import_json(&st, &json, merge)
}
```

- [ ] **Step 5: Register the new commands in `lib.rs` `generate_handler!`**

Add `ipc::export_json,` and `ipc::import_json,` to the macro list.

- [ ] **Step 6: Run tests**

Run: `cd E:\Work\todoMap\src-tauri && cargo test --test export`
Expected: `1 passed`.

- [ ] **Step 7: Commit**

```bash
cd E:\Work\todoMap && git add -A && git commit -m "feat(tauri): JSON export/import for full data portability"
```

### Task 7.2: Add api wrappers for export/import

**Files:**
- Modify: `E:\Work\todoMap\src\api.ts`

- [ ] **Step 1: Append to `src/api.ts`**

```typescript
  exportJson: () => invoke<string>("export_json"),
  importJson: (json: string, merge: boolean) =>
    invoke<void>("import_json", { json, merge }),
```

- [ ] **Step 2: Build**

Run: `cd E:\Work\todoMap && npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
cd E:\Work\todoMap && git add -A && git commit -m "feat(web): api wrappers for export/import"
```

### Task 7.3: Run all tests and final smoke

- [ ] **Step 1: Run all Rust tests**

Run: `cd E:\Work\todoMap\src-tauri && cargo test`
Expected: all tests pass (me, people, projects, todos, comments, export).

- [ ] **Step 2: Run all frontend tests**

Run: `cd E:\Work\todoMap && npm test -- --run`
Expected: layout + edges tests pass.

- [ ] **Step 3: Build the frontend**

Run: `cd E:\Work\todoMap && npm run build`
Expected: success.

- [ ] **Step 4: Document the smoke test**

Run:
```bash
cd E:\Work\todoMap && echo "Smoke tested on $(date -I)" > SMOKE-TESTED.md && git add SMOKE-TESTED.md && git commit -m "docs: record smoke test pass"
```

---

## Self-Review (post-write)

**1. Spec coverage:**

| Spec section | Implementing task(s) |
|---|---|
| 3.1 In scope: Tauri desktop, single user, 3 entities, graph, sidebar, full fields, project mgmt, dedupe, search, export/import | 0.1, 1.5-1.10, 2.1, 3.1, 3.2, 4.1, 5.1-5.6, 6.1, 7.1-7.2 |
| 3.1 Onboarding ("me") | 1.5, 5.1 |
| 7.2 Graph rules (me pinned, one edge per todo, dashed=done) | 3.1, 3.2, 4.1 |
| 7.5 New-todo dialog with full fields | 5.4 |
| 7.6 Todo detail with comments | data model + IPC in 1.9, 1.10; comment UI is open issue below |
| 6.2 Person dedupe by name | 1.6, 5.3 |
| 7.4 Search (todo title filter) | 6.1 |
| 7.4 Project management (entry + create-on-the-fly) | 5.5, 6.1 |
| Export/import JSON | 7.1, 7.2 |
| 8.5 Right-click menus | 4.1 (inlined) |
| 9 Empty state / errors | 5.6, 6.1, 6.2 |

**2. Placeholder scan:** No "TBD" / "implement later" in any step. The one mention of "TODO" in this plan appears only in the self-review table as a coverage note, not as a step.

**3. Type / name consistency:** `Person`, `Project`, `Todo`, `Comment` used identically across Rust and TypeScript. `arcIndex` / `arcCount` defined in `edges.ts` and consumed in `GraphView.tsx`. Tauri command names match `invoke<...>("snake_case")` calls in `api.ts`.

**4. Open issues (call out for the implementer):**
- **Comment UI:** Comment table and IPC exist, but no in-dialog comment list. Add it as a sub-section in `TodoDialog` if needed.
- **People/Project search:** Search box currently only filters by todo title. Extending to people/projects is a one-liner filter in `App.tsx`.
- **Avatar upload:** `Person.avatar_path` exists; the `OnboardingDialog` does not yet have an upload control. MVP-defeats-nothing — you can run with no avatars and add the upload control later.

---

## Execution handoff

Plan complete and saved to `E:\Work\todoMap\docs\superpowers\plans\2026-07-01-todoMap-implementation.md`.

Two execution options:

1. **Subagent-Driven (recommended)** - Dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?