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