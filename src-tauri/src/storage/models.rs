use serde::{Deserialize, Serialize};

/// Сохранённое слово для изучения
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedWord {
    pub id: i64,
    pub word: String,
    pub translation: String,
    pub context: String,
    pub context_translation: String,
    pub screenshot_path: Option<String>,
    pub source_lang: String,
    pub target_lang: String,
    pub created_at: i64,
    pub last_reviewed: Option<i64>,
    pub review_count: i32,
    pub correct_count: i32,
    pub mastery_level: i32, // 0-5, 5 = полностью выучено
    pub next_review: Option<i64>,
    pub ease_factor: f32,
    pub interval: i32,
    pub repetitions: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct LearningStats {
    pub total_words: i32,
    pub words_learned: i32,
    pub words_in_progress: i32,
    pub total_reviews: i32,
    pub correct_reviews: i32,
    pub streak_days: i32,
    pub last_study_date: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub theme: String,
    pub image_replacement: bool,
    pub source_lang: String,
    pub target_lang: String,
    pub hotkey_translate_word: String,
    pub hotkey_translate_area: String,
    pub hotkey_translate_screen: String,
    pub hotkey_translate_clipboard: String,
    pub auto_save_words: bool,
    pub show_notifications: bool,
    pub minimize_to_tray: bool,
    pub start_minimized: bool,
    // Новые настройки
    pub auto_launch: bool,
    pub overlay_opacity: i32,
    pub font_size: String,
    pub overlay_position: String,
    pub auto_copy_translation: bool,
    pub hide_after_translation: bool,
    pub overlay_duration: i32,
    pub floating_delay: i32,
    pub enable_sound: bool,
    pub show_word_context: bool,
    pub compact_mode: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "dark".to_string(),
            source_lang: "en".to_string(),
            target_lang: "ru".to_string(),
            hotkey_translate_word: "Ctrl+U".to_string(),
            hotkey_translate_area: "Ctrl+Y".to_string(),
            hotkey_translate_screen: "Ctrl+T".to_string(),
            hotkey_translate_clipboard: "Ctrl+Shift+C".to_string(),
            image_replacement: false,
            auto_save_words: false,
            show_notifications: true,
            minimize_to_tray: true,
            start_minimized: false,
            // Новые настройки по умолчанию
            auto_launch: false,
            overlay_opacity: 95,
            font_size: "medium".to_string(),
            overlay_position: "top".to_string(),
            auto_copy_translation: false,
            hide_after_translation: false,
            overlay_duration: 5000,
            floating_delay: 1000,
            enable_sound: false,
            show_word_context: true,
            compact_mode: false,
        }
    }
}

/// Результат сессии изучения
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StudySession {
    pub words_studied: i32,
    pub correct_answers: i32,
    pub wrong_answers: i32,
    pub time_spent_seconds: i32,
    pub words_mastered: i32,
}

/// Слово для flashcard
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlashcardWord {
    pub id: i64,
    pub word: String,
    pub translation: String,
    pub context: String,
    pub screenshot_path: Option<String>,
    pub mastery_level: i32,
}
