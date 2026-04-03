//! Модуль текстового layout: измерение, перенос строк, подбор размера шрифта.
//!
//! Отвечает за:
//! - Точное измерение ширины текста через glyph advance widths
//! - Word wrapping с учётом доступной ширины
//! - Бинарный поиск оптимального размера шрифта для multi-line layout
//! - Расчёт line height и вертикального позиционирования

use rusttype::{Font, Scale};

/// Коэффициент высоты строки относительно размера шрифта
const DEFAULT_LINE_HEIGHT_RATIO: f32 = 1.2;

/// Минимальный паддинг для расчётов (пиксели)
const MIN_PADDING: f32 = 2.0;

/// Результат измерения текста
#[derive(Debug, Clone)]
pub struct TextDimensions {
    /// Общая ширина текста (максимальная строка)
    pub width: f32,
    /// Общая высота текста
    pub height: f32,
    /// Количество строк
    pub line_count: usize,
    /// Высоты отдельных строк
    pub line_heights: Vec<f32>,
}

/// Результат word wrapping
#[derive(Debug, Clone)]
pub struct WrappedText {
    /// Строки текста
    pub lines: Vec<String>,
    /// Количество строк
    pub line_count: usize,
}

/// Параметры для расчёта layout
#[derive(Debug, Clone)]
pub struct LayoutParams {
    /// Доступная ширина (без паддингов)
    pub available_width: f32,
    /// Доступная высота (без паддингов)
    pub available_height: f32,
    /// Множитель межбуквенного интервала
    pub letter_spacing: f32,
    /// Коэффициент высоты строки
    pub line_height_ratio: f32,
    /// Минимальный размер шрифта
    pub min_font_size: f32,
    /// Максимальный размер шрифта
    pub max_font_size: f32,
    /// Точность бинарного поиска
    pub tolerance: f32,
}

impl Default for LayoutParams {
    fn default() -> Self {
        Self {
            available_width: 100.0,
            available_height: 30.0,
            letter_spacing: 1.15,
            line_height_ratio: DEFAULT_LINE_HEIGHT_RATIO,
            min_font_size: 8.0,
            max_font_size: 72.0,
            tolerance: 0.25,
        }
    }
}

// ============================================================================
// TEXT MEASUREMENT
// ============================================================================

/// Измерить ширину одной строки текста при заданном размере шрифта.
///
/// Использует glyph advance widths для точного измерения,
/// а не bounding boxes (которые могут быть неточными для пробелов
/// и специальных символов).
pub fn measure_text_width(text: &str, font: &Font, font_size: f32, letter_spacing: f32) -> f32 {
    let scale = Scale::uniform(font_size);
    let mut total_width = 0f32;

    for c in text.chars() {
        let glyph = font.glyph(c).scaled(scale);

        let adv = glyph.h_metrics();
        total_width += adv.advance_width * letter_spacing;
    }

    total_width
}

/// Измерить максимальную высоту глифа в строке.
///
/// Возвращает высоту самой высокой буквы (например, 'b', 'd', 'h'),
/// что важно для вертикального позиционирования.
pub fn measure_text_height(text: &str, font: &Font, font_size: f32) -> f32 {
    let scale = Scale::uniform(font_size);
    let mut max_height = 0f32;

    for c in text.chars() {
        let glyph = font.glyph(c).scaled(scale);
        if let Some(rect) = glyph.exact_bounding_box() {
            max_height = max_height.max(rect.height() as f32);
        }
    }

    // Если текст пустой или состоит из пробелов — возвращаем разумное значение
    if max_height == 0.0 {
        font_size * 0.8
    } else {
        max_height
    }
}

/// Измерить полные размеры multi-line текста.
///
/// Возвращает ширину (максимальная строка), общую высоту
/// и количество строк.
pub fn measure_multiline_text(
    lines: &[String],
    font: &Font,
    font_size: f32,
    letter_spacing: f32,
    line_height_ratio: f32,
) -> TextDimensions {
    if lines.is_empty() {
        return TextDimensions {
            width: 0.0,
            height: 0.0,
            line_count: 0,
            line_heights: vec![],
        };
    }

    let mut max_width = 0f32;
    let mut line_heights = Vec::with_capacity(lines.len());

    for line in lines {
        let line_width = measure_text_width(line, font, font_size, letter_spacing);
        let line_height = measure_text_height(line, font, font_size);

        max_width = max_width.max(line_width);
        line_heights.push(line_height);
    }

    // Общая высота = (N-1) * line_height + высота последней строки
    let line_height = font_size * line_height_ratio;
    let total_height = if lines.len() == 1 {
        line_heights[0]
    } else {
        (lines.len() - 1) as f32 * line_height + line_heights.last().copied().unwrap_or(0.0)
    };

    TextDimensions {
        width: max_width,
        height: total_height,
        line_count: lines.len(),
        line_heights,
    }
}

// ============================================================================
// WORD WRAPPING
// ============================================================================

/// Разбить текст на строки с учётом доступной ширины.
///
/// Алгоритм:
/// 1. Разбиваем по существующим переносам строк
/// 2. Для каждой строки — жадный word wrap:
///    - Добавляем слова пока помещаются
///    - Если слово не помещается — новая строка
/// 3. Если одно слово шире контейнера — принудительно разбиваем
pub fn wrap_text(text: &str, font: &Font, font_size: f32, max_width: f32, letter_spacing: f32) -> WrappedText {
    if text.trim().is_empty() {
        return WrappedText {
            lines: vec![text.to_string()],
            line_count: 1,
        };
    }

    let mut lines: Vec<String> = Vec::new();

    // Разбиваем по существующим переносам строк
    for original_line in text.split('\n') {
        let trimmed = original_line.trim();
        if trimmed.is_empty() {
            lines.push(String::new());
            continue;
        }

        // Разбиваем на слова
        let words: Vec<&str> = trimmed.split_whitespace().collect();

        if words.is_empty() {
            lines.push(String::new());
            continue;
        }

        // Жадный word wrap
        let mut current_line = String::new();
        let mut current_width = 0f32;

        for word in &words {
            let word_with_space = if current_line.is_empty() {
                word.to_string()
            } else {
                format!(" {}", word)
            };

            let word_width = measure_text_width(&word_with_space, font, font_size, letter_spacing);

            if current_width + word_width <= max_width || current_line.is_empty() {
                // Слово помещается (или это первое слово)
                if current_line.is_empty() {
                    current_line = word.to_string();
                    current_width = measure_text_width(word, font, font_size, letter_spacing);
                } else {
                    current_line.push(' ');
                    current_line.push_str(word);
                    current_width += word_width;
                }
            } else {
                // Слово не помещается — сохраняем текущую строку и начинаем новую
                if !current_line.is_empty() {
                    lines.push(current_line);
                }
                current_line = word.to_string();
                current_width = measure_text_width(word, font, font_size, letter_spacing);

                // Если одно слово шире контейнера — принудительно разбиваем
                if current_width > max_width {
                    lines.extend(break_long_word(word, font, font_size, max_width, letter_spacing));
                    current_line.clear();
                    current_width = 0.0;
                }
            }
        }

        if !current_line.is_empty() {
            lines.push(current_line);
        }
    }

    if lines.is_empty() {
        lines.push(String::new());
    }

    WrappedText {
        line_count: lines.len(),
        lines,
    }
}

/// Разбить длинное слово на части, если оно шире контейнера.
///
/// Использует эвристику: разбиваем по символам,
/// накапливаем пока помещается.
fn break_long_word(
    word: &str,
    font: &Font,
    font_size: f32,
    max_width: f32,
    letter_spacing: f32,
) -> Vec<String> {
    let mut parts: Vec<String> = Vec::new();
    let mut current_part = String::new();
    let mut current_width = 0f32;

    for c in word.chars() {
        let char_width = measure_text_width(&c.to_string(), font, font_size, letter_spacing);

        if current_width + char_width <= max_width || current_part.is_empty() {
            current_part.push(c);
            current_width += char_width;
        } else {
            if !current_part.is_empty() {
                parts.push(current_part);
            }
            current_part = c.to_string();
            current_width = char_width;
        }
    }

    if !current_part.is_empty() {
        parts.push(current_part);
    }

    parts
}

// ============================================================================
// FONT SIZE FITTING
// ============================================================================

/// Найти оптимальный размер шрифта через бинарный поиск.
///
/// Алгоритм:
/// 1. Оборачиваем текст при текущем размере
/// 2. Измеряем multi-line размеры
/// 3. Если помещается — пробуем больше, иначе меньше
/// 4. Повторяем пока не достигнем точности
///
/// Учитывает:
/// - Количество строк (влияет на общую высоту)
/// - Line height (font_size * ratio)
/// - Доступную ширину и высоту
pub fn calculate_optimal_font_size(
    text: &str,
    font: &Font,
    params: &LayoutParams,
) -> f32 {
    if params.available_width < MIN_PADDING || params.available_height < MIN_PADDING {
        return params.min_font_size;
    }

    // Safety factor для учёта неточностей растеризации
    let safety_factor = 0.90;
    let safe_width = params.available_width * safety_factor;
    let safe_height = params.available_height * safety_factor;

    let mut low = params.min_font_size;
    let mut high = params.max_font_size.min(params.available_height);
    let mut best_size = params.min_font_size;

    while (high - low) > params.tolerance {
        let mid = (low + high) / 2.0;

        // Оборачиваем текст при текущем размере
        let wrapped = wrap_text(text, font, mid, safe_width, params.letter_spacing);

        // Измеряем multi-line
        let dims = measure_multiline_text(
            &wrapped.lines,
            font,
            mid,
            params.letter_spacing,
            params.line_height_ratio,
        );

        if dims.width <= safe_width && dims.height <= safe_height {
            best_size = mid;
            low = mid + params.tolerance;
        } else {
            high = mid - params.tolerance;
        }
    }

    best_size.max(params.min_font_size)
}

/// Рассчитать вертикальное смещение для центрирования текста.
///
/// Возвращает Y-координату baseline первой строки
/// с учётом вертикального центрирования в контейнере.
pub fn calculate_vertical_offset(
    font_size: f32,
    line_height_ratio: f32,
    line_count: usize,
    container_height: f32,
    max_glyph_height: f32,
) -> f32 {
    if line_count == 0 {
        return container_height / 2.0;
    }

    // Общая высота текста
    let text_height = if line_count == 1 {
        max_glyph_height
    } else {
        (line_count - 1) as f32 * (font_size * line_height_ratio) + max_glyph_height
    };

    // Вертикальное центрирование
    let top_padding = (container_height - text_height) / 2.0;

    // Baseline первой строки = top_padding + высота глифа
    top_padding + max_glyph_height
}

/// Рассчитать Y-координату baseline для конкретной строки.
pub fn calculate_line_baseline_y(
    first_baseline_y: f32,
    line_index: usize,
    font_size: f32,
    line_height_ratio: f32,
) -> f32 {
    if line_index == 0 {
        first_baseline_y
    } else {
        first_baseline_y + line_index as f32 * font_size * line_height_ratio
    }
}

// ============================================================================
// TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn get_test_font() -> Font<'static> {
        // В тестах используем минимальный шрифт
        // Для реальных тестов нужен настоящий шрифт
        // Здесь — заглушка для проверки логики
        let font_data: &[u8] = include_bytes!("../../../../resources/fonts/NotoSans-Regular.ttf");
        Font::try_from_bytes(font_data).expect("Failed to load test font")
    }

    #[test]
    fn test_wrap_text_simple() {
        let font = get_test_font();
        let text = "hello world this is a test";
        let max_width = 100.0;
        let font_size = 14.0;

        let wrapped = wrap_text(text, &font, font_size, max_width, 1.0);

        assert!(!wrapped.lines.is_empty());
        // Проверяем что строки не пустые
        for line in &wrapped.lines {
            let width = measure_text_width(line, &font, font_size, 1.0);
            assert!(width <= max_width + 1.0); // небольшая погрешность допустима
        }
    }

    #[test]
    fn test_measure_text_width_positive() {
        let font = get_test_font();
        let width = measure_text_width("hello", &font, 14.0, 1.0);
        assert!(width > 0.0);
    }

    #[test]
    fn test_calculate_optimal_font_size() {
        let font = get_test_font();
        let params = LayoutParams {
            available_width: 200.0,
            available_height: 50.0,
            min_font_size: 8.0,
            max_font_size: 48.0,
            ..Default::default()
        };

        let size = calculate_optimal_font_size("Hello World", &font, &params);
        assert!(size >= params.min_font_size);
        assert!(size <= params.max_font_size);
    }
}
