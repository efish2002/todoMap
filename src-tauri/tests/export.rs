use tempfile::tempdir;
use todomap_lib::state::AppState;

#[test]
fn export_then_import_roundtrip() {
    let dir = tempdir().unwrap();
    let st = AppState::open(dir.path().to_path_buf()).unwrap();
    let me = todomap_lib::commands::me::get_or_create_me(&st, "me".into(), None).unwrap();
    let other = todomap_lib::commands::people::upsert(&st, "alice".into(), None).unwrap();
    let proj = todomap_lib::commands::projects::create(&st, "P".into(), "#3aa856".into()).unwrap();
    todomap_lib::commands::todos::create(
        &st, "x".into(), None, 0, None, None, proj.id, me.id, other.id,
    ).unwrap();

    let json = todomap_lib::commands::export::export_json(&st).unwrap();
    assert!(json.contains("people"));
    assert!(json.contains("alice"));

    let dir2 = tempdir().unwrap();
    let st2 = AppState::open(dir2.path().to_path_buf()).unwrap();
    todomap_lib::commands::export::import_json(&st2, &json, false).unwrap();
    let people2 = todomap_lib::commands::people::list(&st2).unwrap();
    let todos2 = todomap_lib::commands::todos::list_all(&st2).unwrap();
    assert!(people2.iter().any(|p| p.name == "alice"));
    assert_eq!(todos2.len(), 1);
}
