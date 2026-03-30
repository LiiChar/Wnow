use crate::storage::Database;
use tauri::AppHandle;
use tauri::Manager;

/// Инициализация базы данных
pub fn setup_database(app: &AppHandle) {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .expect("Failed to get app data dir");

    Database::init(app_data_dir).expect("Failed to initialize database");
}
