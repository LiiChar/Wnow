use crate::storage::{AppSettings, Database, FlashcardWord, LearningStats, SavedWord};
use crate::ActiveShortcuts;
use tauri::Manager;

// ===== КОМАНДЫ ДЛЯ БАЗЫ ДАННЫХ =====

/// Добавить слово в изучение
#[tauri::command]
pub async fn add_word_to_study(
    word: String,
    translation: String,
    context: String,
    context_translation: String,
    screenshot_path: Option<String>,
) -> Result<i64, String> {
    // Валидация: слово не должно быть пустым
    let trimmed_word = word.trim();
    if trimmed_word.is_empty() {
        return Err("Слово не может быть пустым".to_string());
    }
    
    Database::add_word(
        trimmed_word,
        &translation,
        &context,
        &context_translation,
        screenshot_path.as_deref(),
        "en",
        "ru",
    )
}

/// Получить все слова
#[tauri::command]
pub async fn get_all_words() -> Result<Vec<SavedWord>, String> {
    Database::get_all_words()
}

/// Получить слова для изучения
#[tauri::command]
pub async fn get_words_for_study(limit: i32) -> Result<Vec<FlashcardWord>, String> {
    Database::get_words_for_study(limit)
}

/// Обновить прогресс слова
#[tauri::command]
pub async fn update_word_progress(word_id: i64, quality: i32) -> Result<(), String> {
    Database::update_word_progress(word_id, quality)
}

/// Удалить слово
#[tauri::command]
pub async fn delete_word(word_id: i64) -> Result<(), String> {
    Database::delete_word(word_id)
}

/// Получить статистику
#[tauri::command]
pub async fn get_learning_stats() -> Result<LearningStats, String> {
    Database::get_stats()
}

/// Получить настройки
#[tauri::command]
pub async fn get_settings() -> AppSettings {
    Database::get_all_settings()
}

/// Сохранить настройки
#[tauri::command]
pub async fn save_settings(settings: AppSettings, app: tauri::AppHandle) -> Result<(), String> {
    Database::save_all_settings(&settings)?;
    
    // Обновляем шорткаты в глобальном состоянии
    let shortcut_state = ActiveShortcuts::from_settings(&settings);
    let state_arc = app.state::<std::sync::Arc<std::sync::Mutex<ActiveShortcuts>>>();
    let mut state = state_arc.lock().map_err(|e| format!("Failed to lock shortcut state: {}", e))?;
    *state = shortcut_state;
    
    // Перерегистрируем шорткаты
    crate::setup::register_shortcuts_from_settings(&app, &settings);
    
    Ok(())
}
