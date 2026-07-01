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