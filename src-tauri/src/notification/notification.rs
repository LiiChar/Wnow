use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationPayload {
    pub id: Option<String>,
    pub title: String,
    pub text: String,
    pub icon: Option<String>,
    pub duration: Option<u64>,
}

/// Показать уведомление в notification окне
pub fn show_notification(app: &tauri::AppHandle, payload: NotificationPayload) {
    if let Some(notification_window) = app.get_webview_window("notification") {
        // Показываем окно если оно скрыто
        let _ = notification_window.show();
        notification_window.set_focus().ok();

        // Отправляем событие с payload
        let _ = app.emit_to("notification", "show_notification", &payload);
    }
}

/// Скрыть notification окно
pub fn hide_notification(app: &tauri::AppHandle) {
    if let Some(notification_window) = app.get_webview_window("notification") {
        let _ = notification_window.hide();
    }
}