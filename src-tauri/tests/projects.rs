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