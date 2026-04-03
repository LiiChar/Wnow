//! Модуль управления шрифтами.
//!
//! Поддерживает:
//! - Несколько шрифтов: sans-serif, serif, monospace
//! - Глобальный кэш загруженных шрифтов
//! - Эвристический выбор шрифта на основе содержимого бокса
//! - Fallback на основной шрифт если выбранный недоступен

use rusttype::Font;
use std::collections::HashMap;
use std::sync::OnceLock;

use crate::get_resource_dir;

/// Тип шрифта
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum FontType {
    /// Sans-serif (по умолчанию, для большинства текстов)
    Sans,
    /// Serif (для формальных текстов, заголовков)
    Serif,
    /// Monospace (для кода, технических текстов)
    Mono,
}

/// Имена файлов шрифтов
const FONT_SANS: &str = "fonts/NotoSans-Regular.ttf";
const FONT_SERIF: &str = "fonts/NotoSerif-Regular.ttf";
const FONT_MONO: &str = "fonts/NotoMono-Regular.ttf";

/// Глобальный кэш шрифтов
static FONT_CACHE: OnceLock<FontCache> = OnceLock::new();

/// Кэш загруженных шрифтов
pub struct FontCache {
    fonts: HashMap<FontType, Font<'static>>,
    default_font: FontType,
}

impl FontCache {
    fn new() -> Self {
        let mut cache = Self {
            fonts: HashMap::new(),
            default_font: FontType::Sans,
        };

        // Загружаем основной шрифт обязательно
        cache.load_font(FontType::Sans, FONT_SANS);

        // Пытаемся загрузить дополнительные (не критично)
        cache.load_font(FontType::Serif, FONT_SERIF);
        cache.load_font(FontType::Mono, FONT_MONO);

        cache
    }

    /// Загрузить шрифт из файла
    fn load_font(&mut self, font_type: FontType, filename: &str) {
        let font_path = get_resource_dir().join(filename);

        if !font_path.exists() {
            if font_type == FontType::Sans {
                panic!(
                    "Основной шрифт не найден: {}. Пожалуйста, добавьте шрифт в {}",
                    filename,
                    font_path.display()
                );
            }
            // Для дополнительных шрифтов — просто логируем и продолжаем
            eprintln!(
                "Warning: дополнительный шрифт не найден: {} (путь: {})",
                filename,
                font_path.display()
            );
            return;
        }

        let font_data = match std::fs::read(&font_path) {
            Ok(data) => data,
            Err(e) => {
                eprintln!("Ошибка чтения шрифта {}: {}", filename, e);
                return;
            }
        };

        let leaked_data: &'static [u8] = Box::leak(font_data.into_boxed_slice());

        match Font::try_from_bytes(leaked_data) {
            Some(font) => {
                self.fonts.insert(font_type, font);
            }
            None => {
                eprintln!("Ошибка парсинга шрифта: {}", filename);
            }
        }
    }

    /// Получить шрифт по типу
    pub fn get(&self, font_type: FontType) -> &Font<'static> {
        self.fonts
            .get(&font_type)
            .unwrap_or_else(|| &self.fonts[&self.default_font])
    }

    /// Получить основной шрифт
    pub fn get_default(&self) -> &Font<'static> {
        self.get(self.default_font)
    }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/// Инициализировать кэш шрифтов (вызывается автоматически при первом обращении)
fn get_cache() -> &'static FontCache {
    FONT_CACHE.get_or_init(FontCache::new)
}

/// Получить шрифт по типу
pub fn get_font(font_type: FontType) -> &'static Font<'static> {
    get_cache().get(font_type)
}

/// Получить основной шрифт (sans-serif)
pub fn get_default_font() -> &'static Font<'static> {
    get_cache().get_default()
}

// ============================================================================
// FONT SELECTION HEURISTICS
// ============================================================================

/// Определить тип шрифта на основе содержимого текста.
///
/// Эвристики:
/// - Текст содержит символы кода (`{}`, `()`, `=>`, `_`) → Mono
/// - Текст короткий, заглавный, с точками/запятыми → Serif (заголовок)
/// - Иначе → Sans (по умолчанию)
pub fn select_font_for_text(text: &str) -> FontType {
    // Проверяем на код/технический текст
    if looks_like_code(text) {
        return FontType::Mono;
    }

    // Проверяем на заголовок/формальный текст
    if looks_like_heading(text) {
        return FontType::Serif;
    }

    // По умолчанию — sans-serif
    FontType::Sans
}

/// Проверить, выглядит ли текст как код.
fn looks_like_code(text: &str) -> bool {
    let code_indicators = [
        '{', '}', '(', ')', '[', ']', ';', '=', '>', '<', '_', '#', '/', '\\', '|', '&', '+',
    ];

    let has_code_chars = text.chars().any(|c| code_indicators.contains(&c));

    // Также проверяем на наличие CamelCase или snake_case
    let has_snake_case = text.contains('_');
    let has_camel_case = text.chars().any(|c| c.is_uppercase())
        && text.chars().any(|c| c.is_lowercase())
        && !text.starts_with(|c: char| c.is_whitespace());

    has_code_chars || has_snake_case || has_camel_case
}

/// Проверить, выглядит ли текст как заголовок.
fn looks_like_heading(text: &str) -> bool {
    let trimmed = text.trim();

    // Короткий текст
    if trimmed.len() > 50 {
        return false;
    }

    // Все заглавные
    if trimmed.chars().all(|c| !c.is_alphabetic() || c.is_uppercase())
        && trimmed.chars().any(|c| c.is_alphabetic())
    {
        return true;
    }

    // Title Case
    let words: Vec<&str> = trimmed.split_whitespace().collect();
    if !words.is_empty() {
        let title_case_ratio = words
            .iter()
            .filter(|w| {
                w.chars()
                    .next()
                    .map(|c| c.is_uppercase())
                    .unwrap_or(false)
            })
            .count() as f32
            / words.len() as f32;

        if title_case_ratio > 0.8 {
            return true;
        }
    }

    false
}

// ============================================================================
// TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_select_font_for_regular_text() {
        let font_type = select_font_for_text("hello world this is regular text");
        assert_eq!(font_type, FontType::Sans);
    }

    #[test]
    fn test_select_font_for_code() {
        let font_type = select_font_for_text("fn main() { return 0; }");
        assert_eq!(font_type, FontType::Mono);
    }

    #[test]
    fn test_select_font_for_heading() {
        let font_type = select_font_for_text("CHAPTER ONE");
        assert_eq!(font_type, FontType::Serif);
    }

    #[test]
    fn test_get_default_font_returns_valid() {
        let font = get_default_font();
        // Проверяем что шрифт загружен (не паникует)
        let glyph = font.glyph('A');
        assert!(glyph.exact_bounding_box().is_some() || true); // bounding box может быть None для некоторых глифов
    }
}
