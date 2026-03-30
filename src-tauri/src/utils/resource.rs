use once_cell::sync::OnceCell;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

static RESOURCE_DIR: OnceCell<PathBuf> = OnceCell::new();

pub fn init_resource_dir(app: &AppHandle) {
    let _path = app
        .path()
        .resource_dir()
        .expect("failed to get resource dir");

    RESOURCE_DIR
        .set(PathBuf::from(
            "E:/code/pet-project/Wnow/src-tauri/resources",
        ))
        .expect("RESOURCE_DIR already set");
    // RESOURCE_DIR.set(path).expect("RESOURCE_DIR already set");
}

pub fn get_resource_dir() -> &'static PathBuf {
    RESOURCE_DIR.get().expect("RESOURCE_DIR not initialized")
}
