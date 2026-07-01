use std::fs;
use std::path::PathBuf;
use todomap_lib::state::AppState;

fn make_test_path(name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join("todomap-tests");
    let _ = fs::create_dir_all(&dir);
    dir.join(format!("{}-{}.sqlite", name, std::process::id()))
}

#[test]
fn upsert_reuses_existing_same_name() {
    let path = make_test_path("people-upsert");
    let _ = fs::remove_file(&path);
    let st = AppState::open_test(&path).unwrap();
    let p1 = todomap_lib::commands::people::upsert(&st, "小王".into(), None).unwrap();
    let p2 = todomap_lib::commands::people::upsert(&st, "小王".into(), None).unwrap();
    assert_eq!(p1.id, p2.id);
    let _ = fs::remove_file(&path);
}

#[test]
fn list_returns_all() {
    let path = make_test_path("people-list");
    let _ = fs::remove_file(&path);
    let st = AppState::open_test(&path).unwrap();
    todomap_lib::commands::people::upsert(&st, "A".into(), None).unwrap();
    todomap_lib::commands::people::upsert(&st, "B".into(), None).unwrap();
    let v = todomap_lib::commands::people::list(&st).unwrap();
    assert_eq!(v.len(), 2);
    let _ = fs::remove_file(&path);
}
