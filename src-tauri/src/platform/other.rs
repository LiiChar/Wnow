/// Для других платформ (iOS, Android) - заглушка
use tauri::WebviewWindow;

/// На мобильных ОС используем стандартный alwaysOnTop из конфига
pub fn set_window_topmost(_window: &WebviewWindow) {
    // Заглушка для неподдерживаемых платформ
}

/// На других платформах нет необходимости скрывать кнопку закрытия
pub fn hide_webview_close_button(_window: &WebviewWindow) {
    // Заглушка для неподдерживаемых платформ
}
