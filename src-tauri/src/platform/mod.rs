#[cfg(target_os = "windows")]
mod windows;
#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "linux")]
mod linux;
#[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
mod other;

#[cfg(target_os = "windows")]
pub use windows::{set_window_topmost, hide_webview_close_button};
#[cfg(target_os = "macos")]
pub use macos::{set_window_topmost, hide_webview_close_button};
#[cfg(target_os = "linux")]
pub use linux::{set_window_topmost, hide_webview_close_button};
#[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
pub use other::{set_window_topmost, hide_webview_close_button};
