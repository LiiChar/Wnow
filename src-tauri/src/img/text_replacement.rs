//! Модуль замены текста на изображениях
//!
//! Pipeline:
//! 1. Получаем изображение и OCR-боксы
//! 2. Для каждого бокса:
//!    - Вырезаем область бокса
//!    - Стираем текст (inpainting)
//!    - Вставляем обратно
//!    - Рисуем переведённый текст поверх

use image::{Rgba, RgbaImage};
use rusttype::{Font, Scale};
use std::sync::OnceLock;

use crate::get_resource_dir;

/// Путь к шрифту по умолчанию
const FONT_FILENAME: &str = "fonts/NotoSans-Regular.ttf";

/// Глобальный кэш шрифта
static FONT: OnceLock<Font<'static>> = OnceLock::new();

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
    /// Шаг подбора размера шрифта
    pub font_size_step: f32,
}

impl Default for TextReplacementParams {
    fn default() -> Self {
        Self {
            mask_padding: 3,
            text_padding: 4,
            overlay_alpha: 0.3,
            min_font_size: 8.0,
            max_font_size: 72.0,
            font_size_step: 0.5,
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
    pub processing_time_ms: u64,
}

/// Получить шрифт из кэша или загрузить из файла
fn get_font() -> &'static Font<'static> {
    FONT.get_or_init(|| {
        let font_path = get_resource_dir().join(FONT_FILENAME);

        if !font_path.exists() {
            panic!(
                "Font file not found: {}. Please download Noto Sans Regular and place it at {}",
                FONT_FILENAME,
                font_path.display()
            );
        }

        let font_data = std::fs::read(&font_path).expect("Failed to read font file");

        let leaked_data: &'static [u8] = Box::leak(font_data.into_boxed_slice());

        Font::try_from_bytes(leaked_data).expect("Failed to parse font")
    })
}

// ============================================================================
// PUBLIC API
// ============================================================================

/// Заменить текст на изображении
///
/// # Аргументы
/// * `image` - исходное изображение в RGBA формате
/// * `boxes` - вектор боксов с оригинальным текстом и переводом
/// * `params` - параметры замены
///
/// # Возвращает
/// Обработанное изображение с заменённым текстом
pub fn replace_text_in_image(
    image: &RgbaImage,
    boxes: &[TranslatedBox],
    params: &TextReplacementParams,
) -> Result<TextReplacementResult, String> {
    let start_time = std::time::Instant::now();

    let font = get_font();
    let mut result_image = image.clone();
    let mut stats = ReplacementStats {
        boxes_processed: boxes.len(),
        ..Default::default()
    };

    let mut total_font_size = 0.0;
    let mut successful_boxes = 0;

    // Обрабатываем каждый бокс
    for box_item in boxes {
        match process_single_box(&mut result_image, box_item, font, params) {
            Ok(font_size) => {
                total_font_size += font_size;
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
/// 1. Вырезать область
/// 2. Удалить текст
/// 3. Вставить обратно
/// 4. Нарисовать перевод
fn process_single_box(
    image: &mut RgbaImage,
    box_item: &TranslatedBox,
    font: &Font,
    params: &TextReplacementParams,
) -> Result<f32, String> {
    let (img_width, img_height) = image.dimensions();

    // Вычисляем координаты с паддингом
    let x_start = box_item.x.saturating_sub(params.mask_padding as i32) as u32;
    let y_start = box_item.y.saturating_sub(params.mask_padding as i32) as u32;
    let x_end = ((box_item.x + box_item.width + params.mask_padding as i32) as u32).min(img_width);
    let y_end =
        ((box_item.y + box_item.height + params.mask_padding as i32) as u32).min(img_height);

    let box_x = x_start;
    let box_y = y_start;
    let box_w = x_end - x_start;
    let box_h = y_end - y_start;

    if box_w == 0 || box_h == 0 {
        return Ok(0.0);
    }

    // Шаг 1: Вырезаем область бокса
    let mut cropped = crop_region(image, box_x, box_y, box_w, box_h);

    // Шаг 2: Стираем текст в вырезанной области (inpainting)
    erase_text_from_region(&mut cropped, params.mask_padding);

    // Шаг 3: Вставляем обработанную область обратно
    paste_region(image, &cropped, box_x, box_y);

    // Шаг 4: Определяем цвет текста и рисуем подложку
    let (text_color, bg_color) = determine_text_color(&cropped, box_w, box_h);

    // Рисуем подложку в области бокса (без паддинга)
    draw_background_rect(
        image,
        box_item.x as u32,
        box_item.y as u32,
        box_item.width as u32,
        box_item.height as u32,
        bg_color,
    );

    // Шаг 5: Вычисляем оптимальный размер шрифта
    let font_size = calculate_optimal_font_size(
        &box_item.translated_text,
        font,
        box_item.width as u32,
        box_item.height as u32,
        params,
    );

    // Шаг 6: Рисуем переведённый текст
    draw_text_on_image(
        image,
        &box_item.translated_text,
        box_item.x as f32,
        box_item.y as f32,
        box_item.width as u32,
        box_item.height as u32,
        font,
        font_size,
        text_color,
    );

    Ok(font_size)
}

// ============================================================================
// IMAGE MANIPULATION
// ============================================================================

/// Вырезать область из изображения
fn crop_region(image: &RgbaImage, x: u32, y: u32, width: u32, height: u32) -> RgbaImage {
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

/// Вставить область в изображение
fn paste_region(image: &mut RgbaImage, region: &RgbaImage, x: u32, y: u32) {
    for cy in 0..region.height() {
        for cx in 0..region.width() {
            let px = x + cx;
            let py = y + cy;
            if px < image.width() && py < image.height() {
                image.put_pixel(px, py, *region.get_pixel(cx, cy));
            }
        }
    }
}

/// Удалить текст из области (inpainting)
fn erase_text_from_region(image: &mut RgbaImage, _padding: u32) {
    let (width, height) = image.dimensions();

    if width == 0 || height == 0 {
        return;
    }

    // Вычисляем средний цвет границы
    let border_color = compute_border_color(image);

    // Заполняем область средним цветом с небольшим шумом
    for y in 0..height {
        for x in 0..width {
            // Добавляем небольшой шум для естественности
            let noise = ((x * y) % 7) as i16 - 3;
            let r = ((border_color[0] as i16 + noise).clamp(0, 255) as u8);
            let g = ((border_color[1] as i16 + noise).clamp(0, 255) as u8);
            let b = ((border_color[2] as i16 + noise).clamp(0, 255) as u8);

            image.put_pixel(x, y, Rgba([r, g, b, 255]));
        }
    }

    // Применяем размытие для сглаживания
    apply_box_blur(image, 2);
}

/// Вычислить средний цвет границы изображения
fn compute_border_color(image: &RgbaImage) -> [u8; 4] {
    let (width, height) = image.dimensions();
    let mut samples = Vec::new();

    let border_thickness = 2;

    // Верхняя и нижняя границы
    for x in 0..width {
        for dy in 0..border_thickness {
            samples.push(*image.get_pixel(x, dy));
            if height > dy {
                samples.push(*image.get_pixel(x, height - 1 - dy));
            }
        }
    }

    // Левая и правая границы
    for y in 0..height {
        for dx in 0..border_thickness {
            samples.push(*image.get_pixel(dx, y));
            if width > dx {
                samples.push(*image.get_pixel(width - 1 - dx, y));
            }
        }
    }

    if samples.is_empty() {
        return [255, 255, 255, 255];
    }

    let mut r_sum: u32 = 0;
    let mut g_sum: u32 = 0;
    let mut b_sum: u32 = 0;
    let mut a_sum: u32 = 0;

    for sample in &samples {
        r_sum += sample[0] as u32;
        g_sum += sample[1] as u32;
        b_sum += sample[2] as u32;
        a_sum += sample[3] as u32;
    }

    let count = samples.len() as u32;
    [
        (r_sum / count) as u8,
        (g_sum / count) as u8,
        (b_sum / count) as u8,
        (a_sum / count) as u8,
    ]
}

/// Применить box blur
fn apply_box_blur(image: &mut RgbaImage, radius: u32) {
    if radius == 0 {
        return;
    }

    let (width, height) = image.dimensions();
    let mut temp = image.clone();
    let kernel_size = radius * 2 + 1;

    for y in 0..height {
        for x in 0..width {
            let mut r_sum: u32 = 0;
            let mut g_sum: u32 = 0;
            let mut b_sum: u32 = 0;
            let mut count: u32 = 0;

            for ky in 0..kernel_size {
                for kx in 0..kernel_size {
                    let px = x.saturating_add(kx).saturating_sub(radius);
                    let py = y.saturating_add(ky).saturating_sub(radius);

                    if px < width && py < height {
                        let pixel = image.get_pixel(px, py);
                        r_sum += pixel[0] as u32;
                        g_sum += pixel[1] as u32;
                        b_sum += pixel[2] as u32;
                        count += 1;
                    }
                }
            }

            if count > 0 {
                temp.put_pixel(
                    x,
                    y,
                    Rgba([
                        (r_sum / count) as u8,
                        (g_sum / count) as u8,
                        (b_sum / count) as u8,
                        255,
                    ]),
                );
            }
        }
    }

    *image = temp;
}

// ============================================================================
// COLOR DETECTION
// ============================================================================

/// Определить оптимальный цвет текста и фона
fn determine_text_color(image: &RgbaImage, width: u32, height: u32) -> (Rgba<u8>, Rgba<u8>) {
    let mut r_sum: u32 = 0;
    let mut g_sum: u32 = 0;
    let mut b_sum: u32 = 0;
    let mut count: u32 = 0;

    for y in 0..height {
        for x in 0..width {
            let pixel = image.get_pixel(x, y);
            r_sum += pixel[0] as u32;
            g_sum += pixel[1] as u32;
            b_sum += pixel[2] as u32;
            count += 1;
        }
    }

    let avg_brightness = if count > 0 {
        (r_sum + g_sum + b_sum) as f32 / (count as f32 * 3.0)
    } else {
        128.0
    };

    // Если фон светлый - текст тёмный, иначе светлый
    let text_color = if avg_brightness > 128.0 {
        Rgba([20, 20, 20, 255])
    } else {
        Rgba([245, 245, 245, 255])
    };

    // Создаём подложку
    let overlay_alpha = (0.3 * 255.0) as u8;
    let bg_color = if avg_brightness > 128.0 {
        Rgba([
            (avg_brightness as u8).saturating_sub(30),
            (avg_brightness as u8).saturating_sub(30),
            (avg_brightness as u8).saturating_sub(30),
            overlay_alpha,
        ])
    } else {
        Rgba([
            (avg_brightness as u8).saturating_add(30),
            (avg_brightness as u8).saturating_add(30),
            (avg_brightness as u8).saturating_add(30),
            overlay_alpha,
        ])
    };

    (text_color, bg_color)
}

// ============================================================================
// BACKGROUND DRAWING
// ============================================================================

/// Нарисовать прямоугольник подложки
fn draw_background_rect(
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
// FONT SIZE CALCULATION
// ============================================================================

/// Вычислить оптимальный размер шрифта
fn calculate_optimal_font_size(
    text: &str,
    font: &Font,
    box_width: u32,
    box_height: u32,
    params: &TextReplacementParams,
) -> f32 {
    let available_width = box_width.saturating_sub(params.text_padding * 2);
    let available_height = box_height.saturating_sub(params.text_padding * 2);

    if available_width == 0 || available_height == 0 {
        return params.min_font_size;
    }

    let mut low = params.min_font_size;
    let mut high = params.max_font_size.min(available_height as f32);
    let mut best_size = params.min_font_size;

    while (high - low) > params.font_size_step / 2.0 {
        let mid = (low + high) / 2.0;
        let scale = Scale::uniform(mid);

        let mut text_width = 0f32;
        let mut max_glyph_height = 0f32;

        for c in text.chars() {
            let glyph = font.glyph(c).scaled(scale);
            if let Some(rect) = glyph.exact_bounding_box() {
                text_width += rect.width() as f32;
                max_glyph_height = max_glyph_height.max(rect.height() as f32);
            } else {
                // Для пробелов
                text_width += mid * 0.3;
            }
        }

        if text_width <= available_width as f32 && max_glyph_height <= available_height as f32 {
            best_size = mid;
            low = mid + params.font_size_step;
        } else {
            high = mid - params.font_size_step;
        }
    }

    best_size.max(params.min_font_size)
}

// ============================================================================
// TEXT RENDERING
// ============================================================================

/// Нарисовать текст на изображении
fn draw_text_on_image(
    image: &mut RgbaImage,
    text: &str,
    x: f32,
    y: f32,
    width: u32,
    height: u32,
    font: &Font,
    font_size: f32,
    color: Rgba<u8>,
) {
    let scale = Scale::uniform(font_size);

    // Вычисляем размеры текста для центрирования
    let mut text_width = 0f32;
    let mut max_glyph_height = 0f32;

    for c in text.chars() {
        let glyph = font.glyph(c).scaled(scale);
        if let Some(rect) = glyph.exact_bounding_box() {
            text_width = text_width.max(rect.max.x as f32);
            max_glyph_height = max_glyph_height.max(rect.height() as f32);
        }
    }

    // Центрируем текст
    let start_x = x + (width as f32 - text_width) / 2.0;
    let start_y = y + (height as f32 - max_glyph_height) / 2.0 + max_glyph_height;

    let mut caret_x = start_x;

    for c in text.chars() {
        let glyph = font
            .glyph(c)
            .scaled(scale)
            .positioned(rusttype::point(caret_x, start_y));

        if let Some(rect) = glyph.pixel_bounding_box() {
            glyph.draw(|gx, gy, alpha| {
                let px = (rect.min.x + gx as i32) as u32;
                let py = (rect.min.y + gy as i32) as u32;

                let (img_width, img_height) = image.dimensions();
                if px < img_width && py < img_height && alpha > 0.0 {
                    let existing = *image.get_pixel(px, py);
                    let text_with_alpha =
                        Rgba([color[0], color[1], color[2], (alpha * 255.0) as u8]);
                    let blended = blend_pixels(existing, text_with_alpha);
                    image.put_pixel(px, py, blended);
                }
            });
            caret_x += rect.width() as f32 * 0.8;
        } else {
            caret_x += font_size * 0.3;
        }
    }
}

// ============================================================================
// BLENDING
// ============================================================================

/// Смешать два пикселя с учётом альфа-канала
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
// UTILS
// ============================================================================

/// Конвертировать OcrWord в TranslatedBox
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
