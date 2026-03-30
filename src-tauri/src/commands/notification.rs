use tauri::Emitter;

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct NotificationPayload {
    pub title: String,
    pub text: String,
    pub icon: Option<String>,
    pub duration: u64,
}

#[tauri::command]
pub fn show_notification(app: tauri::AppHandle, payload: NotificationPayload) {
    app.emit_to("notification", "show_notification", payload)
        .expect("Failed to emit show_notification");
}