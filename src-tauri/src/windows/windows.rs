use tauri::{
    AppHandle, LogicalPosition, LogicalSize, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
};
use tauri_plugin_log::log::{log, Level};

use crate::storage::Database;

pub fn create_main_window(app: &AppHandle) -> Result<WebviewWindow, tauri::Error> {
    let window = WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
        .title("Wnow - Configuration")
        .accept_first_mouse(true)
        .min_inner_size(364f64, 530f64)
        .inner_size(364f64, 530f64)
        .resizable(true)
        .focused(true)
        .decorations(false)
        .build()?;
    
    let start_minimazed: String = Database::get_setting("start_minimized").expect("Couldn get settings 'start_minimazed'");
    println!("start_minimazed: {}", start_minimazed);
    if start_minimazed == "true" {
        let _ = window.hide();
    } else {
        window.show()?;
        window.set_focus()?;
    }

    log!(Level::Info, "Main window initialized");

    Ok(window)
}

pub fn create_notification_window(app: &AppHandle) -> Result<WebviewWindow, tauri::Error> {
    let window = WebviewWindowBuilder::new(app, "notification", WebviewUrl::App("notification.html".into()))
        .title("Wnow - Notification")
        .always_on_top(true)
        .visible_on_all_workspaces(true)
        .shadow(false)
        .decorations(false)
        .transparent(true)
        .resizable(false)
        .skip_taskbar(true)
        .content_protected(true)
        .build()?;

    let monitors = xcap::Monitor::all().expect("Could not retrieve monitors");

    let monitor = monitors
        .iter()
        .find(|m| m.is_primary().unwrap() == true)
        .unwrap_or(monitors.get(0).expect("Cannot find any monitor"));

    // Позиционируем в правый нижний угол после создания
    let scale = monitor.scale_factor().expect("Cannot get scake factor");
    let height = monitor.height().expect("Cannot get inner size");
    let width = monitor.width().expect("Cannot get inner size");
    let position_x = monitor.x().expect("Cannot get position");
    let position_y = monitor.y().expect("Cannot get position");

    let window_width: f64 = 280.0;
    let window_height: f64 = 272.0;

    let x = (position_x as f64 + width as f64 - window_width - 16.0) / scale as f64;
    let y = (position_y as f64 + height as f64 - window_height - 66.0) / scale as f64;

    window
        .set_position(tauri::LogicalPosition::new(x, y))
        .ok();

    log!(Level::Info, "Notification window initialized");

    Ok(window)
}

pub fn create_overlay_window(app: &AppHandle) -> Result<WebviewWindow, tauri::Error> {
    let window = WebviewWindowBuilder::new(app, "overlay", WebviewUrl::App("overlay.html".into()))
        .title("Wnow - Overlay")
        .always_on_top(true)
        .visible_on_all_workspaces(true)
        .shadow(false)
        .decorations(false)
        .transparent(true)
        .resizable(false)
        .skip_taskbar(true)
        .content_protected(true)
        .visible(false)
        .maximized(true)
        .build()?;
    window.set_ignore_cursor_events(true)?;

    let monitors = xcap::Monitor::all().expect("Could not retrieve monitors");

    let monitor = monitors
        .iter()
        .find(|m| m.is_primary().unwrap() == true)
        .unwrap_or(monitors.get(0).expect("Cannot find any monitor"));
    let scale = monitor.scale_factor().unwrap();
    window.set_position(LogicalPosition {
        x: monitor.x().unwrap() as f32 * scale,
        y: monitor.y().unwrap() as f32 * scale,
    })?;
    window.set_size(LogicalSize {
        width: monitor.width().unwrap() as f32,
        height: monitor.height().unwrap() as f32,
    })?;
    window.show()?;
    // window.set_focus()?;
    // window.set_shadow(false)?;

    log!(Level::Info, "Overlay window initialized");

    Ok(window)
}
