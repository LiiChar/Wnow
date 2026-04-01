use crate::notification;
use tauri::Emitter;

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct NotificationPayload {
    pub id: Option<String>,
    pub title: String,
    pub text: String,
    pub icon: Option<String>,
    pub duration: Option<u64>,
}

#[tauri::command]
pub fn show_notification(app: tauri::AppHandle, payload: NotificationPayload) {
    notification::show_notification(&app, notification::NotificationPayload {
        id: payload.id,
        title: payload.title,
        text: payload.text,
        icon: payload.icon,
        duration: payload.duration,
    });
}