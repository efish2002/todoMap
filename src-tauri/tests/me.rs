use std::fs;
use std::path::PathBuf;
use todomap_lib::state::AppState;

fn make_test_path(name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join("todomap-tests");
    let _ = fs::create_dir_all(&dir);
    dir.join(format!("{}-{}.sqlite", name, std::process::id()))
}

#[test]
fn get_or_create_me_creates_then_returns() {
    let path = make_test_path("me");
    let _ = fs::remove_file(&path);
    let st = AppState::open_test(&path).unwrap();
    let me1 = todomap_lib::commands::me::get_or_create_me(&st, "高浩".to_string(), None).unwrap();
    assert_eq!(me1.name, "高浩");
    assert!(me1.is_me);
    let me2 = todomap_lib::commands::me::get_or_create_me(&st, "高浩".to_string(), None).unwrap();
    assert_eq!(me1.id, me2.id);
    let v = todomap_lib::commands::people::list(&st).unwrap();
    assert_eq!(v.iter().filter(|p| p.is_me).count(), 1);
    let _ = fs::remove_file(&path);
}
