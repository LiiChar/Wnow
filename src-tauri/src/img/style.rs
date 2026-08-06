//! Модуль определения стиля текста.
//!
//! Анализирует оригинальный текст и извлекает стилистические свойства:
//! - Регистр (uppercase, lowercase, mixed)
//! - Жирность (bold simulation)
//! - Яркость фона (для выбора цвета текста)
//! - Выравнивание (left/center heuristic)
//! - Визуальная плотность текста

use image::{Rgba, RgbaImage};

/// Регистр текста
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TextCase {
    /// Все заглавные (HELLO WORLD)
    Upper,
    /// Все строчные (hello world)
    Lower,
    /// Смешанный регистр (Hello World)
    Mixed,
}

/// Стиль текста
#[derive(Debug, Clone)]
pub struct TextStyle {
    /// Регистр
    pub text_case: TextCase,
    /// Симуляция жирности (рисовать дважды со смещением)
    pub bold: bool,
    /// Смещение для bold simulation (пиксели)
    pub bold_offset: f32,
    /// Выравнивание
    pub alignment: TextAlignment,
    /// Визуальная плотность (0.0 - 1.0)
    pub density: f32,
}

/// Выравнивание текста
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TextAlignment {
    /// По левому краю (по умолчанию)
    Left,
    /// По центру
    Center,
}

impl Default for TextStyle {
    fn default() -> Self {
        Self {
            text_case: TextCase::Mixed,
            bold: false,
            bold_offset: 0.5,
            alignment: TextAlignment::Left,
            density: 0.5,
        }
    }
}

// ============================================================================
// TEXT CASE DETECTION
// ============================================================================

/// Определить регистр текста.
///
/// Анализирует буквы (игнорируя пробелы и пунктуацию):
/// - Если >80% заглавные → Upper
/// - Если >80% строчные → Lower
/// - Иначе → Mixed
pub fn detect_text_case(text: &str) -> TextCase {
    let letters: Vec<char> = text.chars().filter(|c| c.is_alphabetic()).collect();

    if letters.is_empty() {
        return TextCase::Mixed;
    }

    let uppercase_count = letters.iter().filter(|c| c.is_uppercase()).count();
    let ratio = uppercase_count as f32 / letters.len() as f32;

    // Порог 80% для определения «полностью заглавного»
    if ratio > 0.8 {
        TextCase::Upper
    } else if ratio < 0.2 {
        TextCase::Lower
    } else {
        TextCase::Mixed
    }
}

/// Применить регистр оригинала к переведённому тексту.
///
/// Если оригинал был UPPER → перевод тоже UPPER.
/// Для Mixed и Lower сохраняем оригинал перевода.
pub fn apply_text_case(original: &str, translated: &str) -> String {
    match detect_text_case(original) {
        TextCase::Upper => translated.to_uppercase(),
        TextCase::Lower => translated.to_lowercase(),
        TextCase::Mixed => translated.to_string(),
    }
}

// ============================================================================
// BOLD DETECTION
// ============================================================================

/// Определить, нужно ли симулировать жирный шрифт.
///
/// Эвристики:
/// - Текст содержит только заглавные буквы (часто = заголовки)
/// - Текст короткий и широкий (высокая плотность)
/// - Высота бокса значительно больше высоты шрифта (может быть bold)
pub fn detect_bold(text: &str, box_width: i32, box_height: i32) -> bool {
    // Заглавные часто означают заголовок → bold
    if detect_text_case(text) == TextCase::Upper && text.len() > 2 {
        return true;
    }

    // Высокая визуальная плотность
    let density = calculate_text_density(text, box_width);
    if density > 0.7 {
        return true;
    }

    false
}

/// Рассчитать смещение для bold simulation.
///
/// Зависит от размера шрифта: больше шрифт → больше смещение.
pub fn calculate_bold_offset(font_size: f32) -> f32 {
    // Смещение ~5% от размера шрифта, минимум 0.3, максимум 1.5
    (font_size * 0.05).clamp(0.3, 1.5)
}

// ============================================================================
// TEXT DENSITY
// ============================================================================

/// Рассчитать визуальную плотность текста.
///
/// Отношение количества символов к ширине бокса.
/// Высокая плотность → текст «тесный» → возможно bold.
fn calculate_text_density(text: &str, box_width: i32) -> f32 {
    if box_width <= 0 {
        return 0.0;
    }

    let char_count = text.chars().filter(|c| !c.is_whitespace()).count() as f32;
    let width = box_width as f32;

    // Нормализуем: ~0.15 символов на пиксель = средняя плотность
    let density = char_count / width;
    (density / 0.15).clamp(0.0, 1.0)
}

// ============================================================================
// BRIGHTNESS & COLOR
// ============================================================================

/// Рассчитать среднюю яркость области изображения.
///
/// Возвращает значение 0.0 - 255.0.
pub fn calculate_average_brightness(image: &RgbaImage) -> f32 {
    let (width, height) = image.dimensions();

    if width == 0 || height == 0 {
        return 128.0;
    }

    let mut sum: f32 = 0.0;
    let mut count: u32 = 0;

    // Сэмплируем каждый 4-й пиксель для производительности
    let step = 4;

    for y in (0..height).step_by(step as usize) {
        for x in (0..width).step_by(step as usize) {
            let pixel = image.get_pixel(x, y);
            // Используем luminance: 0.299*R + 0.587*G + 0.114*B
            let luminance = 0.299 * pixel[0] as f32
                + 0.587 * pixel[1] as f32
                + 0.114 * pixel[2] as f32;
            sum += luminance;
            count += 1;
        }
    }

    if count == 0 {
        return 128.0;
    }

    sum / count as f32
}

/// Средний RGB по субдискретизации (для тонированной подложки под локальный фон).
fn sample_average_rgb(image: &RgbaImage) -> (f32, f32, f32) {
    let (width, height) = image.dimensions();
    if width == 0 || height == 0 {
        return (128.0, 128.0, 128.0);
    }
    let step = 4;
    let mut r: f64 = 0.0;
    let mut g: f64 = 0.0;
    let mut b: f64 = 0.0;
    let mut count: u64 = 0;
    for y in (0..height).step_by(step as usize) {
        for x in (0..width).step_by(step as usize) {
            let p = image.get_pixel(x, y);
            r += p[0] as f64;
            g += p[1] as f64;
            b += p[2] as f64;
            count += 1;
        }
    }
    if count == 0 {
        return (128.0, 128.0, 128.0);
    }
    let n = count as f32;
    (r as f32 / n, g as f32 / n, b as f32 / n)
}

/// Определить оптимальный цвет текста на основе яркости фона.
///
/// Если фон светлый (>128) → тёмный текст, иначе светлый.
/// Возвращает (цвет_текста, цвет_подложки).
pub fn determine_text_and_bg_colors(
    image: &RgbaImage,
    overlay_alpha: f32,
) -> (Rgba<u8>, Rgba<u8>) {
    let avg_brightness = calculate_average_brightness(image);
    let (ar, ag, ab) = sample_average_rgb(image);

    // Цвет текста
    let text_color = if avg_brightness > 128.0 {
        Rgba([20, 20, 20, 255])
    } else {
        Rgba([245, 245, 245, 255])
    };

    // Подложка: лёгкий оттенок от реального RGB фона (не одна серая яркость) — строки выглядят согласованно
    let alpha = (overlay_alpha * 255.0) as u8;
    let delta = 22i16;
    let bg_color = if avg_brightness > 128.0 {
        Rgba([
            (ar as i16 - delta).clamp(0, 255) as u8,
            (ag as i16 - delta).clamp(0, 255) as u8,
            (ab as i16 - delta).clamp(0, 255) as u8,
            alpha,
        ])
    } else {
        Rgba([
            (ar as i16 + delta).clamp(0, 255) as u8,
            (ag as i16 + delta).clamp(0, 255) as u8,
            (ab as i16 + delta).clamp(0, 255) as u8,
            alpha,
        ])
    };

    (text_color, bg_color)
}

// ============================================================================
// ALIGNMENT DETECTION
// ============================================================================

/// Определить выравнивание текста.
///
/// Эвристика:
/// - Если текст короткий и центрирован в боксе → Center
/// - Иначе → Left
///
/// В будущем можно анализировать позицию оригинального текста.
pub fn detect_alignment(_text: &str, _box_width: i32, _box_height: i32) -> TextAlignment {
    // Пока всегда Left — наиболее безопасный вариант
    // Можно улучшить, анализируя распределение текста в боксе
    TextAlignment::Left
}

// ============================================================================
// COMPREHENSIVE STYLE ANALYSIS
// ============================================================================

/// Полный анализ стиля текста.
///
/// Собирает все свойства в одну структуру.
pub fn analyze_text_style(
    original_text: &str,
    box_width: i32,
    box_height: i32,
) -> TextStyle {
    let text_case = detect_text_case(original_text);
    let bold = detect_bold(original_text, box_width, box_height);
    let alignment = detect_alignment(original_text, box_width, box_height);
    let density = calculate_text_density(original_text, box_width);
    let bold_offset = if bold { 0.5 } else { 0.0 };

    TextStyle {
        text_case,
        bold,
        bold_offset,
        alignment,
        density,
    }
}

/// Применить стиль к переведённому тексту.
///
/// Возвращает текст с применённым регистром оригинала.
pub fn apply_style_to_translation(original: &str, translated: &str) -> String {
    apply_text_case(original, translated)
}

// ============================================================================
// TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_uppercase() {
        assert_eq!(detect_text_case("HELLO WORLD"), TextCase::Upper);
    }

    #[test]
    fn test_detect_lowercase() {
        assert_eq!(detect_text_case("hello world"), TextCase::Lower);
    }

    #[test]
    fn test_detect_mixed() {
        assert_eq!(detect_text_case("Hello World"), TextCase::Mixed);
    }

    #[test]
    fn test_apply_text_case_upper() {
        let result = apply_text_case("HELLO", "привет");
        assert_eq!(result, "ПРИВЕТ");
    }

    #[test]
    fn test_apply_text_case_mixed() {
        let result = apply_text_case("Hello", "привет");
        assert_eq!(result, "привет"); // сохраняем оригинал
    }

    #[test]
    fn test_detect_bold_uppercase() {
        assert!(detect_bold("HEADER", 100, 30));
    }

    #[test]
    fn test_calculate_average_brightness() {
        use image::RgbaImage;
        let mut img = RgbaImage::new(10, 10);
        // Белый фон
        for y in 0..10 {
            for x in 0..10 {
                img.put_pixel(x, y, Rgba([255, 255, 255, 255]));
            }
        }
        let brightness = calculate_average_brightness(&img);
        assert!(brightness > 200.0);
    }
}
