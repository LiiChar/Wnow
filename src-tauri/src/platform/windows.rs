/// Устанавливает окно поверх всего (включая полноэкранные приложения и панель задач)
/// Для эксклюзивного полноэкранного режима игр рекомендуется использовать "borderless windowed"
use tauri::WebviewWindow;

pub fn set_window_topmost(window: &WebviewWindow) {
    use winapi::um::winuser::{
        SetWindowPos, SetWindowLongW, GetWindowLongW,
        HWND_TOPMOST, SWP_NOMOVE, SWP_NOSIZE, SWP_SHOWWINDOW, SWP_FRAMECHANGED,
        GWL_EXSTYLE, WS_EX_TOPMOST, WS_EX_TOOLWINDOW,
    };

    if let Ok(hwnd) = window.hwnd() {
        let hwnd_ptr = hwnd.0 as *mut _;
        unsafe {
            // Получаем текущие extended стили
            let ex_style = GetWindowLongW(hwnd_ptr, GWL_EXSTYLE);

            // Добавляем флаги: TOPMOST + TOOLWINDOW (не показывается в таскбаре, выше обычных окон)
            let new_style = ex_style | WS_EX_TOPMOST as i32 | WS_EX_TOOLWINDOW as i32;
            SetWindowLongW(hwnd_ptr, GWL_EXSTYLE, new_style);

            // Применяем SetWindowPos с максимальными флагами
            SetWindowPos(
                hwnd_ptr,
                HWND_TOPMOST,
                0, 0, 0, 0,
                SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW | SWP_FRAMECHANGED,
            );
        }
    }
}

/// Скрывает системную кнопку закрытия для прозрачного WebView2 на Windows
pub fn hide_webview_close_button(window: &WebviewWindow) {
    use winapi::um::winuser::{
        SetWindowLongW, GetWindowLongW,
        GWL_STYLE, WS_SYSMENU,
    };

    if let Ok(hwnd) = window.hwnd() {
        let hwnd_ptr = hwnd.0 as *mut _;
        unsafe {
            // Убираем системное меню (включая кнопку закрытия)
            let style = GetWindowLongW(hwnd_ptr, GWL_STYLE);
            let new_style = style & !(WS_SYSMENU as i32);
            SetWindowLongW(hwnd_ptr, GWL_STYLE, new_style);
        }
    }
}
