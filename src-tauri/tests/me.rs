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