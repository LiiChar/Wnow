/// Linux: используем GTK для установки окна поверх всех
use tauri::WebviewWindow;

pub fn set_window_topmost(window: &WebviewWindow) {
    use gtk::prelude::*;

    if let Ok(gtk_window) = window.gtk_window() {
        // set_keep_above(true) устанавливает _NET_WM_STATE_ABOVE
        gtk_window.set_keep_above(true);
        // Также можно попробовать установить тип окна как dock/popup
        gtk_window.set_type_hint(gtk::gdk::WindowTypeHint::Dock);
    }
}

/// На Linux нет необходимости скрывать кнопку закрытия
pub fn hide_webview_close_button(_window: &WebviewWindow) {
    // На Linux не требуется
}
