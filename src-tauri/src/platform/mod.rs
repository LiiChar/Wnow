#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "macos")]
mod macos;
#[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
mod other;
#[cfg(target_os = "windows")]
mod windows;

#[cfg(target_os = "linux")]
pub use linux::{hide_webview_close_button, set_window_topmost};
#[cfg(target_os = "macos")]
pub use macos::{hide_webview_close_button, set_window_topmost};
#[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
pub use other::{hide_webview_close_button, set_window_topmost};
#[cfg(target_os = "windows")]
pub use windows::{hide_webview_close_button, set_window_topmost};
