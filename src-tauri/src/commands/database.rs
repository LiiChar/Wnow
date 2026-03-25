use tauri::Manager;
use crate::storage::{AppSettings, Database, FlashcardWord, LearningStats, SavedWord};

// ===== КОМАНДЫ ДЛЯ БАЗЫ ДАННЫХ =====

/// Добавить слово в изучение
#[tauri::command]
pub async fn add_word_to_study(
    word: String,
    translation: String,
    context: String,
    context_translation: String,
    screenshot_base64: Option<String>,
    app: tauri::AppHandle,
) -> Result<i64, String> {
    // Сохраняем скриншот если есть
    let screenshot_path = if let Some(base64_data) = screenshot_base64 {
        let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
        let screenshots_dir = app_data_dir.join("screenshots");
        std::fs::create_dir_all(&screenshots_dir).ok();

        let filename = format!("{}.png", chrono::Utc::now().timestamp_millis());
        let path = screenshots_dir.join(&filename);

        if let Ok(data) =
            base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &base64_data)
        {
            std::fs::write(&path, data).ok();
            Some(path.to_string_lossy().to_string())
        } else {
            None
        }
    } else {
        None
    };

    Database::add_word(
        &word,
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
pub async fn save_settings(settings: AppSettings) -> Result<(), String> {
    Database::save_all_settings(&settings)
}
