use super::models::*;
use once_cell::sync::Lazy;
use rusqlite::{params, Connection};
use std::path::PathBuf;
use std::sync::Mutex;

static DB: Lazy<Mutex<Option<Connection>>> = Lazy::new(|| Mutex::new(None));

pub struct Database;

impl Database {
    /// Инициализация базы данных
    pub fn init(app_data_dir: PathBuf) -> Result<(), String> {
        let db_path = app_data_dir.join("wnow.db");
        std::fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;

        let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

        // Создаём таблицы
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS words (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                word TEXT NOT NULL,
                translation TEXT NOT NULL,
                context TEXT DEFAULT '',
                context_translation TEXT DEFAULT '',
                screenshot_path TEXT,
                source_lang TEXT DEFAULT 'en',
                target_lang TEXT DEFAULT 'ru',
                created_at INTEGER NOT NULL,
                last_reviewed INTEGER,
                review_count INTEGER DEFAULT 0,
                correct_count INTEGER DEFAULT 0,
                mastery_level INTEGER DEFAULT 0,
                next_review INTEGER
            );
            
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            
            CREATE TABLE IF NOT EXISTS stats (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                total_reviews INTEGER DEFAULT 0,
                correct_reviews INTEGER DEFAULT 0,
                streak_days INTEGER DEFAULT 0,
                last_study_date INTEGER
            );
            
            CREATE INDEX IF NOT EXISTS idx_words_mastery ON words(mastery_level);
            CREATE INDEX IF NOT EXISTS idx_words_next_review ON words(next_review);
        "#,
        )
        .map_err(|e| e.to_string())?;

        // Инициализируем статистику если нет
        conn.execute(
            "INSERT OR IGNORE INTO stats (id, total_reviews, correct_reviews, streak_days) VALUES (1, 0, 0, 0)",
            [],
        ).ok();

        *DB.lock().unwrap() = Some(conn);
        Ok(())
    }

    /// Добавить слово
    pub fn add_word(
        word: &str,
        translation: &str,
        context: &str,
        context_translation: &str,
        screenshot_path: Option<&str>,
        source_lang: &str,
        target_lang: &str,
    ) -> Result<i64, String> {
        let guard = DB.lock().unwrap();
        let conn = guard.as_ref().ok_or("Database not initialized")?;

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        conn.execute(
            "INSERT INTO words (word, translation, context, context_translation, screenshot_path, source_lang, target_lang, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![word, translation, context, context_translation, screenshot_path, source_lang, target_lang, now],
        ).map_err(|e| e.to_string())?;

        Ok(conn.last_insert_rowid())
    }

    /// Получить все слова
    pub fn get_all_words() -> Result<Vec<SavedWord>, String> {
        let guard = DB.lock().unwrap();
        let conn = guard.as_ref().ok_or("Database not initialized")?;

        let mut stmt = conn.prepare(
            "SELECT id, word, translation, context, context_translation, screenshot_path, source_lang, target_lang, created_at, last_reviewed, review_count, correct_count, mastery_level, next_review FROM words ORDER BY created_at DESC"
        ).map_err(|e| e.to_string())?;

        let words = stmt
            .query_map([], |row| {
                Ok(SavedWord {
                    id: row.get(0)?,
                    word: row.get(1)?,
                    translation: row.get(2)?,
                    context: row.get(3)?,
                    context_translation: row.get(4)?,
                    screenshot_path: row.get(5)?,
                    source_lang: row.get(6)?,
                    target_lang: row.get(7)?,
                    created_at: row.get(8)?,
                    last_reviewed: row.get(9)?,
                    review_count: row.get(10)?,
                    correct_count: row.get(11)?,
                    mastery_level: row.get(12)?,
                    next_review: row.get(13)?,
                })
            })
            .map_err(|e| e.to_string())?;

        words
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    }

    /// Получить слова для изучения (flashcards)
    pub fn get_words_for_study(limit: i32) -> Result<Vec<FlashcardWord>, String> {
        let guard = DB.lock().unwrap();
        let conn = guard.as_ref().ok_or("Database not initialized")?;

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let mut stmt = conn
            .prepare(
                "SELECT id, word, translation, context, screenshot_path, mastery_level FROM words 
             WHERE mastery_level < 5 AND (next_review IS NULL OR next_review <= ?1)
             ORDER BY mastery_level ASC, next_review ASC NULLS FIRST
             LIMIT ?2",
            )
            .map_err(|e| e.to_string())?;

        let words = stmt
            .query_map(params![now, limit], |row| {
                Ok(FlashcardWord {
                    id: row.get(0)?,
                    word: row.get(1)?,
                    translation: row.get(2)?,
                    context: row.get(3)?,
                    screenshot_path: row.get(4)?,
                    mastery_level: row.get(5)?,
                })
            })
            .map_err(|e| e.to_string())?;

        words
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    }

    /// Обновить прогресс слова после review
    pub fn update_word_progress(word_id: i64, correct: bool) -> Result<(), String> {
        let guard = DB.lock().unwrap();
        let conn = guard.as_ref().ok_or("Database not initialized")?;

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        // Получаем текущий уровень
        let (mastery_level, correct_count): (i32, i32) = conn
            .query_row(
                "SELECT mastery_level, correct_count FROM words WHERE id = ?1",
                params![word_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .map_err(|e| e.to_string())?;

        let new_mastery = if correct {
            (mastery_level + 1).min(5)
        } else {
            (mastery_level - 1).max(0)
        };

        // Интервал повторения: 1 день, 3 дня, 7 дней, 14 дней, 30 дней
        let intervals = [86400, 259200, 604800, 1209600, 2592000];
        let next_review = now + intervals[new_mastery.min(4) as usize];

        conn.execute(
            "UPDATE words SET mastery_level = ?1, last_reviewed = ?2, review_count = review_count + 1, correct_count = correct_count + ?3, next_review = ?4 WHERE id = ?5",
            params![new_mastery, now, if correct { 1 } else { 0 }, next_review, word_id],
        ).map_err(|e| e.to_string())?;

        // Обновляем статистику
        conn.execute(
            "UPDATE stats SET total_reviews = total_reviews + 1, correct_reviews = correct_reviews + ?1 WHERE id = 1",
            params![if correct { 1 } else { 0 }],
        ).map_err(|e| e.to_string())?;

        Ok(())
    }

    /// Удалить слово
    pub fn delete_word(word_id: i64) -> Result<(), String> {
        let guard = DB.lock().unwrap();
        let conn = guard.as_ref().ok_or("Database not initialized")?;

        conn.execute("DELETE FROM words WHERE id = ?1", params![word_id])
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    /// Получить статистику
    pub fn get_stats() -> Result<LearningStats, String> {
        let guard = DB.lock().unwrap();
        let conn = guard.as_ref().ok_or("Database not initialized")?;

        let total_words: i32 = conn
            .query_row("SELECT COUNT(*) FROM words", [], |row| row.get(0))
            .unwrap_or(0);

        let words_learned: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM words WHERE mastery_level >= 5",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);

        let words_in_progress: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM words WHERE mastery_level > 0 AND mastery_level < 5",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);

        let (total_reviews, correct_reviews, streak_days, last_study_date): (i32, i32, i32, Option<i64>) = conn.query_row(
            "SELECT total_reviews, correct_reviews, streak_days, last_study_date FROM stats WHERE id = 1",
            [],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        ).unwrap_or((0, 0, 0, None));

        Ok(LearningStats {
            total_words,
            words_learned,
            words_in_progress,
            total_reviews,
            correct_reviews,
            streak_days,
            last_study_date,
        })
    }

    /// Сохранить настройку
    pub fn set_setting(key: &str, value: &str) -> Result<(), String> {
        let guard = DB.lock().unwrap();
        let conn = guard.as_ref().ok_or("Database not initialized")?;

        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            params![key, value],
        )
        .map_err(|e| e.to_string())?;

        Ok(())
    }

    /// Получить настройку
    pub fn get_setting(key: &str) -> Option<String> {
        let guard = DB.lock().unwrap();
        let conn = guard.as_ref()?;

        conn.query_row(
            "SELECT value FROM settings WHERE key = ?1",
            params![key],
            |row| row.get(0),
        )
        .ok()
    }

    /// Получить все настройки
    pub fn get_all_settings() -> AppSettings {
        let mut settings = AppSettings::default();

        if let Some(v) = Self::get_setting("theme") {
            settings.theme = v;
        }
        if let Some(v) = Self::get_setting("source_lang") {
            settings.source_lang = v;
        }
        if let Some(v) = Self::get_setting("target_lang") {
            settings.target_lang = v;
        }
        if let Some(v) = Self::get_setting("hotkey_translate_word") {
            settings.hotkey_translate_word = v;
        }
        if let Some(v) = Self::get_setting("hotkey_translate_area") {
            settings.hotkey_translate_area = v;
        }
        if let Some(v) = Self::get_setting("hotkey_translate_screen") {
            settings.hotkey_translate_screen = v;
        }
        if let Some(v) = Self::get_setting("auto_save_words") {
            settings.auto_save_words = v == "true";
        }
        if let Some(v) = Self::get_setting("show_notifications") {
            settings.show_notifications = v == "true";
        }
        if let Some(v) = Self::get_setting("minimize_to_tray") {
            settings.minimize_to_tray = v == "true";
        }
        if let Some(v) = Self::get_setting("start_minimized") {
            settings.start_minimized = v == "true";
        }
        if let Some(v) = Self::get_setting("is_pro") {
            settings.is_pro = v == "true";
        }

        settings
    }

    /// Сохранить все настройки
    pub fn save_all_settings(settings: &AppSettings) -> Result<(), String> {
        Self::set_setting("theme", &settings.theme)?;
        Self::set_setting("source_lang", &settings.source_lang)?;
        Self::set_setting("target_lang", &settings.target_lang)?;
        Self::set_setting("hotkey_translate_word", &settings.hotkey_translate_word)?;
        Self::set_setting("hotkey_translate_area", &settings.hotkey_translate_area)?;
        Self::set_setting("hotkey_translate_screen", &settings.hotkey_translate_screen)?;
        Self::set_setting(
            "auto_save_words",
            if settings.auto_save_words {
                "true"
            } else {
                "false"
            },
        )?;
        Self::set_setting(
            "show_notifications",
            if settings.show_notifications {
                "true"
            } else {
                "false"
            },
        )?;
        Self::set_setting(
            "minimize_to_tray",
            if settings.minimize_to_tray {
                "true"
            } else {
                "false"
            },
        )?;
        Self::set_setting(
            "start_minimized",
            if settings.start_minimized {
                "true"
            } else {
                "false"
            },
        )?;
        Self::set_setting("is_pro", if settings.is_pro { "true" } else { "false" })?;
        Ok(())
    }
}
