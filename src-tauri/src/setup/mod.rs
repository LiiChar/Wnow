mod shortcuts;
mod tray;
mod windows;
mod database;

pub use tray::setup_tray;
pub use windows::{setup_overlay_window, setup_main_window};
pub use database::setup_database;
pub use shortcuts::register_shortcut_handler;
