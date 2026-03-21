/// macOS: устанавливает уровень окна выше всех остальных
use tauri::WebviewWindow;

pub fn set_window_topmost(window: &WebviewWindow) {
    use cocoa::appkit::NSWindow;
    use cocoa::base::id;

    // NSScreenSaverWindowLevel = 1000, это выше всех обычных окон
    const NS_SCREEN_SAVER_WINDOW_LEVEL: i64 = 1000;

    if let Ok(ns_window) = window.ns_window() {
        unsafe {
            let ns_win: id = ns_window.cast();
            ns_win.setLevel_(NS_SCREEN_SAVER_WINDOW_LEVEL);
        }
    }
}

/// На macOS нет необходимости скрывать кнопку закрытия
pub fn hide_webview_close_button(_window: &WebviewWindow) {
    // На macOS не требуется
}
