use once_cell::sync::OnceCell;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, path::BaseDirectory};

static RESOURCE_DIR: OnceCell<PathBuf> = OnceCell::new();

pub fn init_resource_dir(app: &AppHandle) {

    let mut resource_path = PathBuf::new();

    if cfg!(dev) {
        resource_path = "E:/code/pet-project/Wnow/src-tauri/resources".into();
    } else {
        resource_path = app.path().resolve("resources", BaseDirectory::Resource).expect("Failed to resolve resource path");
    }

    println!("Initialize resource dir: {}", resource_path.display());

    RESOURCE_DIR
        .set(PathBuf::from(
            resource_path,
        ))
        .expect("RESOURCE_DIR already set");
    // RESOURCE_DIR.set(path).expect("RESOURCE_DIR already set");
}

pub fn get_resource_dir() -> &'static PathBuf {
    RESOURCE_DIR.get().expect("RESOURCE_DIR not initialized")
}
