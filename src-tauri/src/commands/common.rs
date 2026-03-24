use crate::mouse::Mouse;
use crate::translation::translate;

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