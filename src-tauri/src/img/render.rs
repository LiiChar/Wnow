//! Модуль рендеринга текста.
//!
//! Отвечает за:
//! - Построчный рендеринг с правильным позиционированием глифов
//! - Вертикальное и горизонтальное выравнивание
//! - Bold simulation (двойная отрисовка со смещением)
//! - Alpha-blending с существующим изображением
//! - Debug mode (отрисовка bounding boxes)

use image::{Rgba, RgbaImage};
use rusttype::{Font, Scale, point};

use crate::img::layout::{calculate_line_baseline_y, calculate_vertical_offset, measure_text_height, wrap_text};
use crate::img::style::TextAlignment;

/// Параметры рендеринга текста
#[derive(Debug, Clone)]
pub struct TextRenderParams {
    /// Размер шрифта
    pub font_size: f32,
    /// Цвет текста
    pub text_color: Rgba<u8>,
    /// Множитель межбуквенного интервала
    pub letter_spacing: f32,
    /// Коэффициент высоты строки
    pub line_height_ratio: f32,
    /// Выравнивание
    pub alignment: TextAlignment,
    /// Симуляция жирности
    pub bold: bool,
    /// Смещение для bold simulation
    pub bold_offset: f32,
    /// Паддинг внутри контейнера
    pub padding: f32,
    /// Debug mode (рисовать bounding box)
    pub debug_mode: bool,
    /// Цвет debug bounding box
    pub debug_color: Rgba<u8>,
}

impl Default for TextRenderParams {
    fn default() -> Self {
        Self {
            font_size: 14.0,
            text_color: Rgba([20, 20, 20, 255]),
            letter_spacing: 1.15,
            line_height_ratio: 1.2,
            alignment: TextAlignment::Left,
            bold: false,
            bold_offset: 0.5,
            padding: 4.0,
            debug_mode: false,
            debug_color: Rgba([255, 0, 0, 128]),
        }
    }
}

/// Результат рендеринга
#[derive(Debug, Clone)]
pub struct TextRenderResult {
    /// Количество отрисованных строк
    pub lines_rendered: usize,
    /// Фактический размер шрифта
    pub font_size: f32,
    /// Общая высота текста
    pub text_height: f32,
    /// Максимальная ширина строки
    pub max_line_width: f32,
}

// ============================================================================
// MAIN RENDER FUNCTION
// ============================================================================

/// Нарисовать multi-line текст на изображении.
///
/// Алгоритм:
/// 1. Оборачиваем текст в строки
/// 2. Вычисляем вертикальное смещение для центрирования
/// 3. Для каждой строки:
///    a. Вычисляем baseline Y
///    b. Вычисляем startX (alignment)
///    c. Рендерим глифы с правильным позиционированием
///    d. Если bold — рендерим второй раз со смещением
///
/// # Аргументы
/// * `image` — целевое изображение
/// * `text` — текст для рендеринга
/// * `x, y` — верхний левый угол контейнера
/// * `container_width, container_height` — размеры контейнера
/// * `font` — шрифт
/// * `params` — параметры рендеринга
pub fn render_text(
    image: &mut RgbaImage,
    text: &str,
    x: f32,
    y: f32,
    container_width: f32,
    container_height: f32,
    font: &Font,
    params: &TextRenderParams,
) -> TextRenderResult {
    // Доступная область внутри паддингов
    let avail_width = container_width - params.padding * 2.0;
    let avail_height = container_height - params.padding * 2.0;

    if avail_width <= 0.0 || avail_height <= 0.0 {
        return TextRenderResult {
            lines_rendered: 0,
            font_size: params.font_size,
            text_height: 0.0,
            max_line_width: 0.0,
        };
    }

    // Оборачиваем текст
    let wrapped = wrap_text(
        text,
        font,
        params.font_size,
        avail_width,
        params.letter_spacing,
    );

    if wrapped.lines.is_empty() {
        return TextRenderResult {
            lines_rendered: 0,
            font_size: params.font_size,
            text_height: 0.0,
            max_line_width: 0.0,
        };
    }

    // Находим максимальную высоту глифа для вертикального центрирования
    let mut max_glyph_height = 0f32;
    for line in &wrapped.lines {
        let h = measure_text_height(line, font, params.font_size);
        max_glyph_height = max_glyph_height.max(h);
    }

    if max_glyph_height == 0.0 {
        max_glyph_height = params.font_size * 0.8;
    }

    // Вертикальное центрирование
    let first_baseline_y = calculate_vertical_offset(
        params.font_size,
        params.line_height_ratio,
        wrapped.line_count,
        avail_height,
        max_glyph_height,
    );

    // Смещение контейнера
    let offset_x = x + params.padding;
    let offset_y = y + params.padding;

    let mut max_line_width = 0f32;

    // Рендерим каждую строку
    for (line_idx, line) in wrapped.lines.iter().enumerate() {
        // Базовая линия для этой строки
        let baseline_y = calculate_line_baseline_y(
            first_baseline_y,
            line_idx,
            params.font_size,
            params.line_height_ratio,
        );

        // Измеряем ширину строки для выравнивания
        let line_width = measure_text_width_for_string(
            line,
            font,
            params.font_size,
            params.letter_spacing,
        );

        max_line_width = max_line_width.max(line_width);

        // Вычисляем startX на основе выравнивания
        let start_x = match params.alignment {
            TextAlignment::Left => offset_x,
            TextAlignment::Center => {
                let available = container_width - params.padding * 2.0;
                offset_x + (available - line_width).max(0.0) / 2.0
            }
        };

        // Рендерим строку
        render_single_line(
            image,
            line,
            start_x,
            offset_y + baseline_y,
            font,
            params,
        );

        // Bold simulation
        if params.bold && params.bold_offset > 0.0 {
            render_single_line(
                image,
                line,
                start_x + params.bold_offset,
                offset_y + baseline_y + params.bold_offset * 0.5,
                font,
                params,
            );
        }
    }

    // Debug mode: рисуем bounding box
    if params.debug_mode {
        draw_debug_rect(
            image,
            x,
            y,
            container_width,
            container_height,
            &params.debug_color,
        );
    }

    // Общая высота текста
    let text_height = if wrapped.line_count == 1 {
        max_glyph_height
    } else {
        (wrapped.line_count - 1) as f32 * params.font_size * params.line_height_ratio
            + max_glyph_height
    };

    TextRenderResult {
        lines_rendered: wrapped.line_count,
        font_size: params.font_size,
        text_height,
        max_line_width,
    }
}

// ============================================================================
// SINGLE LINE RENDERING
// ============================================================================

/// Нарисать одну строку текста.
///
/// Использует glyph advance widths для правильного позиционирования
/// и pixel_bounding_box для точной отрисовки каждого глифа.
fn render_single_line(
    image: &mut RgbaImage,
    text: &str,
    start_x: f32,
    baseline_y: f32,
    font: &Font,
    params: &TextRenderParams,
) {
    let scale = Scale::uniform(params.font_size);
    let mut caret_x = start_x;

    for c in text.chars() {
        let scaled_glyph = font.glyph(c).scaled(scale);

        // Получаем advance width ДО positioned() (positioned забирает владение)
        let advance_width = scaled_glyph.h_metrics().advance_width;

        let glyph = scaled_glyph.positioned(point(caret_x, baseline_y));

        if let Some(bounding_box) = glyph.pixel_bounding_box() {
            // Рендерим глиф
            glyph.draw(|gx, gy, alpha| {
                let px = (bounding_box.min.x + gx as i32) as u32;
                let py = (bounding_box.min.y + gy as i32) as u32;

                let (img_width, img_height) = image.dimensions();
                if px < img_width && py < img_height && alpha > 0.01 {
                    let existing = *image.get_pixel(px, py);
                    let text_pixel = Rgba([
                        params.text_color[0],
                        params.text_color[1],
                        params.text_color[2],
                        (alpha * 255.0) as u8,
                    ]);
                    let blended = blend_pixels(existing, text_pixel);
                    image.put_pixel(px, py, blended);
                }
            });
        }

        // Продвигаем caret по advance width
        caret_x += advance_width * params.letter_spacing;
    }
}

// ============================================================================
// TEXT WIDTH MEASUREMENT
// ============================================================================

/// Измерить ширину строки текста.
fn measure_text_width_for_string(
    text: &str,
    font: &Font,
    font_size: f32,
    letter_spacing: f32,
) -> f32 {
    let scale = Scale::uniform(font_size);
    let mut total_width = 0f32;

    for c in text.chars() {
        let glyph = font.glyph(c).scaled(scale);
        let adv = glyph.h_metrics();
        total_width += adv.advance_width * letter_spacing;
    }

    total_width
}

// ============================================================================
// BLENDING
// ============================================================================

/// Смешать два пикселя с учётом альфа-канала.
///
/// Использует стандартное alpha blending:
/// result = foreground * alpha + background * (1 - alpha)
fn blend_pixels(background: Rgba<u8>, foreground: Rgba<u8>) -> Rgba<u8> {
    let fg_alpha = foreground[3] as f32 / 255.0;
    let bg_alpha = 1.0 - fg_alpha;

    Rgba([
        ((background[0] as f32 * bg_alpha) + (foreground[0] as f32 * fg_alpha)) as u8,
        ((background[1] as f32 * bg_alpha) + (foreground[1] as f32 * fg_alpha)) as u8,
        ((background[2] as f32 * bg_alpha) + (foreground[2] as f32 * fg_alpha)) as u8,
        255,
    ])
}

// ============================================================================
// DEBUG RENDERING
// ============================================================================

/// Нарисовать debug bounding box.
fn draw_debug_rect(
    image: &mut RgbaImage,
    x: f32,
    y: f32,
    width: f32,
    height: f32,
    color: &Rgba<u8>,
) {
    let (img_width, img_height) = image.dimensions();
    let x_end = (x + width).min(img_width as f32) as u32;
    let y_end = (y + height).min(img_height as f32) as u32;
    let x_start = x as u32;
    let y_start = y as u32;

    let line_thickness = 2;

    // Верхняя и нижняя линии
    for px in x_start..x_end {
        for dy in 0..line_thickness {
            if y_start + dy < img_height {
                image.put_pixel(px, y_start + dy, *color);
            }
            if y_end > dy && y_end - 1 - dy < img_height {
                image.put_pixel(px, y_end - 1 - dy, *color);
            }
        }
    }

    // Левая и правая линии
    for py in y_start..y_end {
        for dx in 0..line_thickness {
            if x_start + dx < img_width {
                image.put_pixel(x_start + dx, py, *color);
            }
            if x_end > dx && x_end - 1 - dx < img_width {
                image.put_pixel(x_end - 1 - dx, py, *color);
            }
        }
    }
}

// ============================================================================
// BACKGROUND RECT DRAWING
// ============================================================================

/// Нарисовать прямоугольник подложки с alpha blending.
///
/// Используется для создания полупрозрачного фона под текстом.
pub fn draw_background_rect(
    image: &mut RgbaImage,
    x: u32,
    y: u32,
    width: u32,
    height: u32,
    color: Rgba<u8>,
) {
    let (img_width, img_height) = image.dimensions();
    let x_end = (x + width).min(img_width);
    let y_end = (y + height).min(img_height);

    for py in y..y_end {
        for px in x..x_end {
            let existing = *image.get_pixel(px, py);
            let blended = blend_pixels(existing, color);
            image.put_pixel(px, py, blended);
        }
    }
}

// ============================================================================
// TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn get_test_font() -> Font<'static> {
        let font_data: &[u8] = include_bytes!("../../../../resources/fonts/NotoSans-Regular.ttf");
        Font::try_from_bytes(font_data).expect("Failed to load test font")
    }

    #[test]
    fn test_render_text_produces_pixels() {
        let font = get_test_font();
        let mut image = RgbaImage::new(200, 50);

        // Белый фон
        for y in 0..50 {
            for x in 0..200 {
                image.put_pixel(x, y, Rgba([255, 255, 255, 255]));
            }
        }

        let params = TextRenderParams {
            font_size: 16.0,
            text_color: Rgba([0, 0, 0, 255]),
            ..Default::default()
        };

        let result = render_text(
            &mut image,
            "Hello World",
            10.0,
            10.0,
            180.0,
            30.0,
            &font,
            &params,
        );

        assert!(result.lines_rendered > 0);
        assert!(result.max_line_width > 0.0);
    }

    #[test]
    fn test_blend_pixels() {
        let bg = Rgba([255, 255, 255, 255]);
        let fg = Rgba([0, 0, 0, 128]); // 50% чёрный

        let result = blend_pixels(bg, fg);

        // Должно быть примерно серым
        assert!(result[0] > 100 && result[0] < 160);
    }
}
