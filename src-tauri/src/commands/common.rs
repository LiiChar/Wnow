use crate::mouse::Mouse;
use crate::translation::translate;
use rdev::{listen, Event, EventType};
use tauri::{WebviewWindow, Emitter};
use serde::Serialize;


#[tauri::command]
pub fn set_clickthrough(enabled: bool) {
    println!("set_clickthrough: {}", enabled);
}

#[tauri::command]
pub fn get_mouse_position() -> (i32, i32) {
    Mouse::new().get_position()
}

#[tauri::command]
pub async fn quick_translate(word: String) -> Result<String, String> {
    match translate(word, "en", "ru").await {
        Ok(translation) => Ok(translation),
        Err(e) => Err(e.to_string()),
    }
}

/// Batch перевод нескольких слов за раз (быстрее чем по одному)
#[tauri::command]
pub async fn batch_translate(words: Vec<String>) -> Vec<(String, String)> {
    crate::translation::translate_words_batch(words, "en", "ru").await
}

#[tauri::command]
pub fn log(message: String) {
    println!("{}", message);
}


#[derive(Serialize, Clone)]
struct MousePos { x: f64, y: f64 }

pub fn start_global_mouse_stream(window: WebviewWindow) {
    std::thread::spawn(move || {
        let callback = move |event: Event| {
            if let EventType::MouseMove { x, y } = event.event_type {
                let _ = window.emit("device-mouse-move", MousePos { x, y });
            }
        };
        if let Err(e) = listen(callback) {
            eprintln!("rdev error: {:?}", e);
        }
    });
}