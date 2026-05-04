//! Модуль замены текста на изображениях.
//!
//! Pipeline:
//! 1. Получаем изображение и OCR-боксы с переводом
//! 2. Для каждого бокса:
//!    - Анализируем стиль оригинального текста
//!    - Выбираем подходящий шрифт
//!    - Вырезаем область бокса
//!    - Стираем текст (blur-based background reconstruction)
//!    - Вставляем обработанную область обратно
//!    - Рисуем подложку
//!    - Рендерим переведённый текст с multi-line wrapping
//!
//! Архитектура:
//! - `layout.rs` — word wrapping, text measurement, font size fitting
//! - `style.rs` — style detection (uppercase, bold, alignment)
//! - `background.rs` — background reconstruction (blur, edge-aware fill)
//! - `render.rs` — multi-line text rendering с glyph positioning
//! - `font.rs` — multi-font support (sans, serif, mono)

use image::RgbaImage;
use rusttype::Font;

use crate::img::background::erase_text_from_image;
use crate::img::font::{get_default_font, get_font, select_font_for_text};
use crate::img::layout::{calculate_optimal_font_size, LayoutParams};
use crate::img::render::{draw_background_rect, render_text, TextRenderParams};
use crate::img::style::{
    analyze_text_style, apply_style_to_translation, determine_text_and_bg_colors, TextAlignment,
};

// ============================================================================
// PUBLIC TYPES
// ============================================================================

/// Параметры для замены текста
#[derive(Debug, Clone)]
pub struct TextReplacementParams {
    /// Паддинг вокруг бокса для маски (в пикселях)
    pub mask_padding: u32,
    /// Паддинг внутри бокса для текста
    pub text_padding: u32,
    /// Прозрачность подложки (0.0 - 1.0)
    pub overlay_alpha: f32,
    /// Минимальный размер шрифта
    pub min_font_size: f32,
    /// Максимальный размер шрифта
    pub max_font_size: f32,
    /// Точность подбора размера шрифта
    pub font_size_tolerance: f32,
    /// Множитель межбуквенного интервала (1.0 = стандартный кернинг)
    pub letter_spacing: f32,
    /// Коэффициент высоты строки
    pub line_height_ratio: f32,
    /// Использовать edge-aware background reconstruction (медленнее, но качественнее)
    pub use_edge_aware_bg: bool,
    /// Радиус размытия фона
    pub bg_blur_radius: u32,
    /// Выравнивание текста (переопределяет автоопределение)
    pub alignment_override: Option<TextAlignment>,
    /// Debug mode (рисовать bounding boxes)
    pub debug_mode: bool,
}

impl Default for TextReplacementParams {
    fn default() -> Self {
        Self {
            mask_padding: 1,
            text_padding: 2,
            overlay_alpha: 0.25,
            min_font_size: 11.0,
            max_font_size: 72.0,
            font_size_tolerance: 0.1,
            letter_spacing: 1.1,
            line_height_ratio: 1.2,
            use_edge_aware_bg: false,
            bg_blur_radius: 3,
            alignment_override: None,
            debug_mode: false,
        }
    }
}

/// OCR-бокс с переводом
#[derive(Debug, Clone)]
pub struct TranslatedBox {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
    pub original_text: String,
    pub translated_text: String,
}

/// Результат замены текста
#[derive(Debug)]
pub struct TextReplacementResult {
    /// Обработанное изображение
    pub image: RgbaImage,
    /// Статистика обработки
    pub stats: ReplacementStats,
}

/// Статистика замены текста
#[derive(Debug, Default)]
pub struct ReplacementStats {
    pub boxes_processed: usize,
    pub boxes_successful: usize,
    pub avg_font_size: f32,
    pub avg_lines_per_box: f32,
    pub processing_time_ms: u64,
}

/// Результат обработки одного бокса (для внутреннего использования)
struct BoxProcessResult {
    font_size: f32,
    lines_rendered: usize,
}

// ============================================================================
// PUBLIC API
// ============================================================================

/// Заменить текст на изображении.
///
/// # Аргументы
/// * `image` — исходное изображение в RGBA формате
/// * `boxes` — вектор боксов с оригинальным текстом и переводом
/// * `params` — параметры замены
///
/// # Возвращает
/// Обработанное изображение с заменённым текстом
pub fn replace_text_in_image(
    image: &RgbaImage,
    boxes: &[TranslatedBox],
    params: &TextReplacementParams,
) -> Result<TextReplacementResult, String> {
    let start_time = std::time::Instant::now();

    let font = get_default_font();
    let mut result_image = image.clone();
    let mut stats = ReplacementStats {
        boxes_processed: boxes.len(),
        ..Default::default()
    };

    let mut total_font_size = 0.0;
    let mut total_lines = 0;
    let mut successful_boxes = 0;

    let mut ordered: Vec<&TranslatedBox> = boxes.iter().collect();
    // Стабильный порядок: сверху вниз, слева направо; при перекрытии позже нарисованный бокс сверху
    ordered.sort_by(|a, b| {
        a.y
            .cmp(&b.y)
            .then_with(|| a.x.cmp(&b.x))
            .then_with(|| a.width.cmp(&b.width))
    });

    // Обрабатываем каждый бокс
    for box_item in ordered {
        match process_single_box(&mut result_image, box_item, font, params) {
            Ok(result) => {
                total_font_size += result.font_size;
                total_lines += result.lines_rendered;
                successful_boxes += 1;
            }
            Err(e) => {
                eprintln!("Error processing box: {}", e);
            }
        }
    }

    stats.boxes_successful = successful_boxes;
    if successful_boxes > 0 {
        stats.avg_font_size = total_font_size / successful_boxes as f32;
        stats.avg_lines_per_box = total_lines as f32 / successful_boxes as f32;
    }
    stats.processing_time_ms = start_time.elapsed().as_millis() as u64;

    Ok(TextReplacementResult {
        image: result_image,
        stats,
    })
}

// ============================================================================
// BOX PROCESSING
// ============================================================================

/// Обработать один бокс:
/// 1. Анализ стиля оригинального текста
/// 2. Выбор шрифта
/// 3. Вырезание области
/// 4. Удаление текста (background reconstruction)
/// 5. Вставка обратно
/// 6. Рисование подложки
/// 7. Рендеринг перевода
fn process_single_box(
    image: &mut RgbaImage,
    box_item: &TranslatedBox,
    _default_font: &Font,
    params: &TextReplacementParams,
) -> Result<BoxProcessResult, String> {
    let (img_width, img_height) = image.dimensions();
    let padding = params.mask_padding as i32;

    // Вычисляем координаты с паддингом
    let x_start_i = (box_item.x - padding).max(0);
    let y_start_i = (box_item.y - padding).max(0);
    let x_end_i = (box_item.x + box_item.width + padding)
        .min(img_width as i32)
        .max(0);
    let y_end_i = (box_item.y + box_item.height + padding)
        .min(img_height as i32)
        .max(0);

    // Проверка валидности
    if x_end_i <= x_start_i || y_end_i <= y_start_i {
        return Err("Invalid box after bounds clamp".into());
    }

    let box_x = x_start_i as u32;
    let box_y = y_start_i as u32;
    let box_w = (x_end_i - x_start_i) as u32;
    let box_h = (y_end_i - y_start_i) as u32;

    if box_w == 0 || box_h == 0 {
        return Err("Zero-size box".into());
    }

    // --- Шаг 1: Анализ стиля оригинального текста ---
    let style = analyze_text_style(
        &box_item.original_text,
        box_item.width,
        box_item.height,
    );

    // --- Шаг 2: Применяем стиль к переводу ---
    let styled_translation =
        apply_style_to_translation(&box_item.original_text, &box_item.translated_text);

    // --- Шаг 3: Выбор шрифта ---
    let font_type = select_font_for_text(&box_item.original_text);
    let font = get_font(font_type);

    // --- Шаг 4: Вырезаем область бокса ---
    let mut cropped = crop_region_fast(image, box_x, box_y, box_w, box_h);

    // --- Шаг 5: Стираем текст (background reconstruction) ---
    erase_text_from_image(&mut cropped, params.use_edge_aware_bg, params.bg_blur_radius);

    // --- Шаг 6: Вставляем только прямоугольник OCR (без полей mask_padding) ---
    // Иначе размытая область вокруг бокса перезаписывает соседние блоки и ломает их рендер.
    paste_crop_rect_for_box(
        image,
        &cropped,
        x_start_i,
        y_start_i,
        box_item,
    );

    // --- Шаг 7: Определяем цвет текста и фона ---
    let (text_color, bg_color) = determine_text_and_bg_colors(&cropped, params.overlay_alpha);

    // --- Шаг 8: Рисуем подложку в области бокса (без паддинга) ---
    draw_background_rect(
        image,
        box_item.x as u32,
        box_item.y as u32,
        box_item.width as u32,
        box_item.height as u32,
        bg_color,
    );

    // --- Шаг 9: Вычисляем оптимальный размер шрифта ---
    let available_width = box_item.width as f32 - 2.0 * params.text_padding as f32;
    let available_height = box_item.height as f32 - 2.0 * params.text_padding as f32;

    let layout_params = LayoutParams {
        available_width: available_width.max(0.0),
        available_height: available_height.max(0.0),
        letter_spacing: params.letter_spacing,
        line_height_ratio: params.line_height_ratio,
        min_font_size: params.min_font_size,
        max_font_size: params.max_font_size,
        tolerance: params.font_size_tolerance,
    };

    let font_size = calculate_optimal_font_size(&styled_translation, font, &layout_params);

    // --- Шаг 10: Рендерим переведённый текст ---
    let alignment = params
        .alignment_override
        .unwrap_or(style.alignment);

    let render_params = TextRenderParams {
        font_size,
        text_color,
        letter_spacing: params.letter_spacing,
        line_height_ratio: params.line_height_ratio,
        alignment,
        bold: style.bold,
        bold_offset: style.bold_offset,
        padding: params.text_padding as f32,
        debug_mode: params.debug_mode,
        ..Default::default()
    };

    let render_result = render_text(
        image,
        &styled_translation,
        box_item.x as f32,
        box_item.y as f32,
        box_item.width as f32,
        box_item.height as f32,
        font,
        &render_params,
    );

    Ok(BoxProcessResult {
        font_size,
        lines_rendered: render_result.lines_rendered,
    })
}

// ============================================================================
// IMAGE MANIPULATION (OPTIMIZED)
// ============================================================================

/// Вырезать область из изображения.
///
/// Оптимизированная версия: использует copy_from_slice где возможно.
fn crop_region_fast(image: &RgbaImage, x: u32, y: u32, width: u32, height: u32) -> RgbaImage {
    let mut cropped = RgbaImage::new(width, height);

    // Проверяем что область внутри изображения
    if x + width > image.width() || y + height > image.height() {
        // Фоллбэк на по-пиксельную копию с проверкой границ
        return crop_region_safe(image, x, y, width, height);
    }

    // Быстрая копия: строка за строкой
    for cy in 0..height {
        let src_row = y + cy;
        for cx in 0..width {
            let src_col = x + cx;
            cropped.put_pixel(cx, cy, *image.get_pixel(src_col, src_row));
        }
    }

    cropped
}

/// Безопасная копия с проверкой границ для каждого пикселя.
fn crop_region_safe(image: &RgbaImage, x: u32, y: u32, width: u32, height: u32) -> RgbaImage {
    let mut cropped = RgbaImage::new(width, height);

    for cy in 0..height {
        for cx in 0..width {
            let px = x + cx;
            let py = y + cy;
            if px < image.width() && py < image.height() {
                cropped.put_pixel(cx, cy, *image.get_pixel(px, py));
            }
        }
    }

    cropped
}

/// Вставить из crop только те пиксели, что попадают в OCR-бокс (в координатах полного кадра).
fn paste_crop_rect_for_box(
    image: &mut RgbaImage,
    crop: &RgbaImage,
    crop_origin_x: i32,
    crop_origin_y: i32,
    box_item: &TranslatedBox,
) {
    let (img_w, img_h) = image.dimensions();
    let bx0 = box_item.x.max(0);
    let by0 = box_item.y.max(0);
    let bx1 = (box_item.x + box_item.width).min(img_w as i32);
    let by1 = (box_item.y + box_item.height).min(img_h as i32);
    if bx1 <= bx0 || by1 <= by0 {
        return;
    }

    let (cw, ch) = crop.dimensions();
    for py in by0..by1 {
        let sy = py - crop_origin_y;
        if sy < 0 {
            continue;
        }
        let sy = sy as u32;
        if sy >= ch {
            continue;
        }
        for px in bx0..bx1 {
            let sx = px - crop_origin_x;
            if sx < 0 {
                continue;
            }
            let sx = sx as u32;
            if sx >= cw {
                continue;
            }
            image.put_pixel(px as u32, py as u32, *crop.get_pixel(sx, sy));
        }
    }
}

// ============================================================================
// UTILS
// ============================================================================

/// Конвертировать OcrWord в TranslatedBox.
pub fn ocr_word_to_translated_box(
    x: i32,
    y: i32,
    w: i32,
    h: i32,
    original: &str,
    translated: &str,
) -> TranslatedBox {
    TranslatedBox {
        x,
        y,
        width: w,
        height: h,
        original_text: original.to_string(),
        translated_text: translated.to_string(),
    }
}

/// Создать параметры для debug mode.
pub fn debug_params() -> TextReplacementParams {
    TextReplacementParams {
        debug_mode: true,
        ..Default::default()
    }
}
