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

        conn.execute_batch(
            r#"
            ALTER TABLE words ADD COLUMN ease_factor REAL DEFAULT 2.5;
            ALTER TABLE words ADD COLUMN interval INTEGER DEFAULT 0;
            ALTER TABLE words ADD COLUMN repetitions INTEGER DEFAULT 0;
        "#,
        )
        .ok();

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
            "INSERT INTO words (
                word, translation, context, context_translation, screenshot_path, 
                source_lang, target_lang, created_at,
                ease_factor, interval, repetitions, next_review
            ) 
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 2.5, 0, 0, ?8)",
            params![
                word,
                translation,
                context,
                context_translation,
                screenshot_path,
                source_lang,
                target_lang,
                now
            ],
        )
        .map_err(|e| e.to_string())?;

        Ok(conn.last_insert_rowid())
    }

    /// Получить все слова
    pub fn get_all_words() -> Result<Vec<SavedWord>, String> {
        let guard = DB.lock().unwrap();
        let conn = guard.as_ref().ok_or("Database not initialized")?;

        let mut stmt = conn.prepare(
            "SELECT id, word, translation, context, context_translation, screenshot_path, source_lang, target_lang, created_at, last_reviewed, review_count, correct_count, mastery_level, next_review, ease_factor, interval, repetitions FROM words ORDER BY created_at DESC"
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
                    ease_factor: row.get(14)?,
                    interval: row.get(15)?,
                    repetitions: row.get(16)?,
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

        let review_limit = (limit as f32 * 0.7) as i32;

        // 🔥 REVIEW
        let mut review_stmt = conn
            .prepare(
                "SELECT id, word, translation, context, screenshot_path 
            FROM words 
            WHERE next_review <= ?1
            ORDER BY next_review ASC
            LIMIT ?2",
            )
            .map_err(|e| e.to_string())?;

        let review_words: Vec<FlashcardWord> = review_stmt
            .query_map(params![now, review_limit], |row| {
                Ok(FlashcardWord {
                    id: row.get(0)?,
                    word: row.get(1)?,
                    translation: row.get(2)?,
                    context: row.get(3)?,
                    screenshot_path: row.get(4)?,
                    mastery_level: 0, // больше не используем
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        // 🔥 NEW
        let remaining = limit - review_words.len() as i32;

        let mut new_words = vec![];

        if remaining > 0 {
            let mut new_stmt = conn
                .prepare(
                    "SELECT id, word, translation, context, screenshot_path 
                FROM words 
                WHERE repetitions = 0
                ORDER BY created_at DESC
                LIMIT ?1",
                )
                .map_err(|e| e.to_string())?;

            new_words = new_stmt
                .query_map(params![remaining], |row| {
                    Ok(FlashcardWord {
                        id: row.get(0)?,
                        word: row.get(1)?,
                        translation: row.get(2)?,
                        context: row.get(3)?,
                        screenshot_path: row.get(4)?,
                        mastery_level: 0,
                    })
                })
                .map_err(|e| e.to_string())?
                .collect::<Result<Vec<_>, _>>()
                .map_err(|e| e.to_string())?;
        }

        // 🔀 MIX
        let mut result = vec![];
        let mut r = review_words;
        let mut n = new_words;

        while !r.is_empty() || !n.is_empty() {
            let take_review = if !r.is_empty() {
                if n.is_empty() {
                    true
                } else {
                    rand::random::<f32>() < 0.7
                }
            } else {
                false
            };

            if take_review {
                result.push(r.remove(0));
            } else if !n.is_empty() {
                result.push(n.remove(0));
            }
        }

        Ok(result)
    }

    /// Обновить прогресс слова после review
    pub fn update_word_progress(word_id: i64, quality: i32) -> Result<(), String> {
        let guard = DB.lock().unwrap();
        let conn = guard.as_ref().ok_or("Database not initialized")?;

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let (ease_factor, interval, repetitions): (f32, i32, i32) = conn
            .query_row(
                "SELECT ease_factor, interval, repetitions FROM words WHERE id = ?1",
                params![word_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .map_err(|e| e.to_string())?;

        let mut ef = ease_factor;
        let mut rep = repetitions;
        let mut int = interval;

        if quality < 3 {
            rep = 0;
            int = 1;
        } else {
            rep += 1;

            if rep == 1 {
                int = 1;
            } else if rep == 2 {
                int = 6;
            } else {
                int = (int as f32 * ef) as i32;
            }
        }

        // 🔥 обновление ease factor
        ef = ef + (0.1 - (5 - quality) as f32 * (0.08 + (5 - quality) as f32 * 0.02));
        if ef < 1.3 {
            ef = 1.3;
        }

        let next_review = now + int as i64 * 86400;

        conn.execute(
            "UPDATE words 
            SET ease_factor = ?1,
                interval = ?2,
                repetitions = ?3,
                last_reviewed = ?4,
                review_count = review_count + 1,
                correct_count = correct_count + ?5,
                next_review = ?6
            WHERE id = ?7",
            params![
                ef,
                int,
                rep,
                now,
                if quality >= 3 { 1 } else { 0 },
                next_review,
                word_id
            ],
        )
        .map_err(|e| e.to_string())?;

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
        if let Some(v) = Self::get_setting("hotkey_translate_clipboard") {
            settings.hotkey_translate_clipboard = v;
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
        if let Some(v) = Self::get_setting("image_replacement") {
            settings.image_replacement = v == "true";
        }
        // Новые настройки
        if let Some(v) = Self::get_setting("auto_launch") {
            settings.auto_launch = v == "true";
        }
        if let Some(v) = Self::get_setting("overlay_opacity") {
            settings.overlay_opacity = v.parse().unwrap_or(95);
        }
        if let Some(v) = Self::get_setting("font_size") {
            settings.font_size = v;
        }
        if let Some(v) = Self::get_setting("overlay_position") {
            settings.overlay_position = v;
        }
        if let Some(v) = Self::get_setting("auto_copy_translation") {
            settings.auto_copy_translation = v == "true";
        }
        if let Some(v) = Self::get_setting("hide_after_translation") {
            settings.hide_after_translation = v == "true";
        }
        if let Some(v) = Self::get_setting("overlay_duration") {
            settings.overlay_duration = v.parse().unwrap_or(5000);
        }
        if let Some(v) = Self::get_setting("enable_sound") {
            settings.enable_sound = v == "true";
        }
        if let Some(v) = Self::get_setting("show_word_context") {
            settings.show_word_context = v == "true";
        }
        if let Some(v) = Self::get_setting("compact_mode") {
            settings.compact_mode = v == "true";
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
        Self::set_setting("hotkey_translate_clipboard", &settings.hotkey_translate_clipboard)?;
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
        Self::set_setting("image_replacement", if settings.image_replacement { "true" } else { "false" })?;
        // Новые настройки
        Self::set_setting("auto_launch", if settings.auto_launch { "true" } else { "false" })?;
        Self::set_setting("overlay_opacity", &settings.overlay_opacity.to_string())?;
        Self::set_setting("font_size", &settings.font_size)?;
        Self::set_setting("overlay_position", &settings.overlay_position)?;
        Self::set_setting("auto_copy_translation", if settings.auto_copy_translation { "true" } else { "false" })?;
        Self::set_setting("hide_after_translation", if settings.hide_after_translation { "true" } else { "false" })?;
        Self::set_setting("overlay_duration", &settings.overlay_duration.to_string())?;
        Self::set_setting("enable_sound", if settings.enable_sound { "true" } else { "false" })?;
        Self::set_setting("show_word_context", if settings.show_word_context { "true" } else { "false" })?;
        Self::set_setting("compact_mode", if settings.compact_mode { "true" } else { "false" })?;
        Ok(())
    }
}
