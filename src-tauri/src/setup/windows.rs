use crate::platform::{hide_webview_close_button, set_window_topmost};
use tauri::{AppHandle, Emitter, Manager};

/// Настройка overlay окна (прозрачное, для перевода)
pub fn setup_overlay_window(app: &AppHandle) {
    if let Some(overlay) = app.get_webview_window("overlay") {
        overlay.set_ignore_cursor_events(true).unwrap();

        // Скрываем системную кнопку закрытия (WebView2 на Windows показывает её)
        hide_webview_close_button(&overlay);

        // Устанавливаем окно поверх всего (включая полноэкранные игры и панель задач)
        set_window_topmost(&overlay);

        let app_handle = app.clone();
        let overlay_clone = overlay.clone();
        overlay.on_window_event(move |event| {
            match event {
                tauri::WindowEvent::Focused(false) => {
                    app_handle.emit_to("overlay", "close_popup", ()).ok();
                    if let Some(w) = app_handle.get_webview_window("overlay") {
                        w.set_ignore_cursor_events(true).ok();
                    }
                }
                tauri::WindowEvent::Focused(true) => {
                    // Когда окно получает фокус, снова устанавливаем topmost
                    set_window_topmost(&overlay_clone);
                }
                _ => {}
            }
        });
    }
}

/// Настройка main окна - при закрытии скрываем вместо уничтожения
pub fn setup_main_window(app: &AppHandle) {
    if let Some(main_window) = app.get_webview_window("main") {
        let app_handle_main = app.clone();
        main_window.on_window_event(move |event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Предотвращаем закрытие окна
                api.prevent_close();
                // Вместо этого скрываем его
                if let Some(w) = app_handle_main.get_webview_window("main") {
                    w.hide().ok();
                }
            }
        });
    }
}

/// Настройка notification окна - прозрачное, поверх всех окон
pub fn setup_notification_window(app: &AppHandle) {
    if let Some(notification) = app.get_webview_window("notification") {
        notification.set_ignore_cursor_events(true).ok();
        set_window_topmost(&notification);
    }
}
