mod database;
mod shortcuts;
mod tray;
mod windows;

pub use database::setup_database;
pub use shortcuts::register_shortcut_handler;
pub use tray::setup_tray;
pub use windows::{setup_main_window, setup_notification_window, setup_overlay_window};
