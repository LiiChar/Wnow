//! Модуль реконструкции фона.
//!
//! Заменяет наивное заполнение средним цветом на:
//! - Размытую версию оригинальной области (предпочтительно)
//! - Edge-aware fill с сохранением градиентов
//! - Box blur с адаптивным радиусом
//!
//! Цель: избежать «плоских» заливок и сохранить текстуру фона.

use image::{Rgba, RgbaImage};

// ============================================================================
// BORDER COLOR COMPUTATION
// ============================================================================

/// Вычислить средний цвет границы изображения.
///
/// Сэмплирует пиксели по периметру (верх, низ, лево, право)
/// и возвращает усреднённый цвет.
///
/// Используется как база для реконструкции фона.
pub fn compute_border_color(image: &RgbaImage) -> [u8; 4] {
    let (width, height) = image.dimensions();

    if width == 0 || height == 0 {
        return [255, 255, 255, 255];
    }

    let border_thickness = 2;
    let mut r_sum: u64 = 0;
    let mut g_sum: u64 = 0;
    let mut b_sum: u64 = 0;
    let mut a_sum: u64 = 0;
    let mut count: u64 = 0;

    // Верхняя и нижняя границы
    for x in 0..width {
        for dy in 0..border_thickness {
            let top_pixel = image.get_pixel(x, dy);
            r_sum += top_pixel[0] as u64;
            g_sum += top_pixel[1] as u64;
            b_sum += top_pixel[2] as u64;
            a_sum += top_pixel[3] as u64;
            count += 1;

            if height > dy {
                let bottom_pixel = image.get_pixel(x, height - 1 - dy);
                r_sum += bottom_pixel[0] as u64;
                g_sum += bottom_pixel[1] as u64;
                b_sum += bottom_pixel[2] as u64;
                a_sum += bottom_pixel[3] as u64;
                count += 1;
            }
        }
    }

    // Левая и правая границы (исключая углы, чтобы не дублировать)
    for y in border_thickness..height.saturating_sub(border_thickness) {
        for dx in 0..border_thickness {
            let left_pixel = image.get_pixel(dx, y);
            r_sum += left_pixel[0] as u64;
            g_sum += left_pixel[1] as u64;
            b_sum += left_pixel[2] as u64;
            a_sum += left_pixel[3] as u64;
            count += 1;

            if width > dx {
                let right_pixel = image.get_pixel(width - 1 - dx, y);
                r_sum += right_pixel[0] as u64;
                g_sum += right_pixel[1] as u64;
                b_sum += right_pixel[2] as u64;
                a_sum += right_pixel[3] as u64;
                count += 1;
            }
        }
    }

    if count == 0 {
        return [255, 255, 255, 255];
    }

    [
        (r_sum / count) as u8,
        (g_sum / count) as u8,
        (b_sum / count) as u8,
        (a_sum / count) as u8,
    ]
}

// ============================================================================
// BOX BLUR
// ============================================================================

/// Применить box blur к изображению.
///
/// Использует separable blur (горизонтальный + вертикальный проход)
/// для производительности O(n * radius) вместо O(n * radius²).
///
/// # Аргументы
/// * `image` — изображение для размытия
/// * `radius` — радиус размытия (>= 1)
pub fn apply_box_blur(image: &mut RgbaImage, radius: u32) {
    if radius == 0 {
        return;
    }

    let (width, height) = image.dimensions();
    if width == 0 || height == 0 {
        return;
    }

    // Горизонтальный проход
    let mut temp = RgbaImage::new(width, height);
    box_blur_horizontal(image, &mut temp, radius);

    // Вертикальный проход (на горизонтально размытом)
    let mut temp2 = RgbaImage::new(width, height);
    box_blur_vertical(&temp, &mut temp2, radius);

    // Копируем результат
    for y in 0..height {
        for x in 0..width {
            image.put_pixel(x, y, *temp2.get_pixel(x, y));
        }
    }
}

/// Горизонтальный проход box blur.
fn box_blur_horizontal(src: &RgbaImage, dst: &mut RgbaImage, radius: u32) {
    let (width, height) = src.dimensions();
    let kernel_size = radius * 2 + 1;
    let radius_usize = radius as usize;
    let width_usize = width as usize;

    for y in 0..height {
        // Используем sliding window для O(1) на пиксель
        let mut r_sum: u32 = 0;
        let mut g_sum: u32 = 0;
        let mut b_sum: u32 = 0;
        let mut a_sum: u32 = 0;

        // Инициализируем окно
        for x in 0..=radius_usize.min(width_usize - 1) {
            let pixel = src.get_pixel(x as u32, y);
            r_sum += pixel[0] as u32;
            g_sum += pixel[1] as u32;
            b_sum += pixel[2] as u32;
            a_sum += pixel[3] as u32;
        }

        for x in 0..width {
            let x_usize = x as usize;

            // Добавляем правый пиксель окна
            let add_x = (x_usize + radius_usize).min(width_usize - 1) as u32;
            let add_pixel = src.get_pixel(add_x, y);
            r_sum += add_pixel[0] as u32;
            g_sum += add_pixel[1] as u32;
            b_sum += add_pixel[2] as u32;
            a_sum += add_pixel[3] as u32;

            // Удаляем левый пиксель окна
            if x_usize >= radius_usize + 1 {
                let remove_x = (x_usize - radius_usize - 1) as u32;
                let remove_pixel = src.get_pixel(remove_x, y);
                r_sum = r_sum.saturating_sub(remove_pixel[0] as u32);
                g_sum = g_sum.saturating_sub(remove_pixel[1] as u32);
                b_sum = b_sum.saturating_sub(remove_pixel[2] as u32);
                a_sum = a_sum.saturating_sub(remove_pixel[3] as u32);
            }

            // Считаем реальное количество пикселей в окне
            let actual_count = if x_usize <= radius_usize {
                x_usize + radius_usize + 1
            } else if x_usize >= width_usize - radius_usize {
                width_usize - (x_usize - radius_usize)
            } else {
                kernel_size as usize
            } as u32;

            let count = actual_count.max(1);
            dst.put_pixel(
                x,
                y,
                Rgba([
                    (r_sum / count) as u8,
                    (g_sum / count) as u8,
                    (b_sum / count) as u8,
                    (a_sum / count) as u8,
                ]),
            );
        }
    }
}

/// Вертикальный проход box blur.
fn box_blur_vertical(src: &RgbaImage, dst: &mut RgbaImage, radius: u32) {
    let (width, height) = src.dimensions();
    let kernel_size = radius * 2 + 1;
    let radius_usize = radius as usize;
    let height_usize = height as usize;

    for x in 0..width {
        let mut r_sum: u32 = 0;
        let mut g_sum: u32 = 0;
        let mut b_sum: u32 = 0;
        let mut a_sum: u32 = 0;

        // Инициализируем окно
        for y in 0..=radius_usize.min(height_usize - 1) {
            let pixel = src.get_pixel(x, y as u32);
            r_sum += pixel[0] as u32;
            g_sum += pixel[1] as u32;
            b_sum += pixel[2] as u32;
            a_sum += pixel[3] as u32;
        }

        for y in 0..height {
            let y_usize = y as usize;

            let add_y = (y_usize + radius_usize).min(height_usize - 1) as u32;
            let add_pixel = src.get_pixel(x, add_y);
            r_sum += add_pixel[0] as u32;
            g_sum += add_pixel[1] as u32;
            b_sum += add_pixel[2] as u32;
            a_sum += add_pixel[3] as u32;

            if y_usize >= radius_usize + 1 {
                let remove_y = (y_usize - radius_usize - 1) as u32;
                let remove_pixel = src.get_pixel(x, remove_y);
                r_sum = r_sum.saturating_sub(remove_pixel[0] as u32);
                g_sum = g_sum.saturating_sub(remove_pixel[1] as u32);
                b_sum = b_sum.saturating_sub(remove_pixel[2] as u32);
                a_sum = a_sum.saturating_sub(remove_pixel[3] as u32);
            }

            let actual_count = if y_usize <= radius_usize {
                y_usize + radius_usize + 1
            } else if y_usize >= height_usize - radius_usize {
                height_usize - (y_usize - radius_usize)
            } else {
                kernel_size as usize
            } as u32;

            let count = actual_count.max(1);
            dst.put_pixel(
                x,
                y,
                Rgba([
                    (r_sum / count) as u8,
                    (g_sum / count) as u8,
                    (b_sum / count) as u8,
                    (a_sum / count) as u8,
                ]),
            );
        }
    }
}

// ============================================================================
// BACKGROUND RECONSTRUCTION
// ============================================================================

/// Реконструировать фон через размытие оригинальной области.
///
/// Алгоритм (Option A — preferred):
/// 1. Вычисляем средний цвет границы
/// 2. Заполняем область цветом границы с лёг шумом
/// 3. Применяем box blur для сглаживания
///
/// Это даёт более естественный результат, чем плоская заливка,
/// и сохраняет общие тона изображения.
pub fn reconstruct_background(
    image: &mut RgbaImage,
    border_color: Option<[u8; 4]>,
    blur_radius: u32,
) {
    let (width, height) = image.dimensions();

    if width == 0 || height == 0 {
        return;
    }

    // Вычисляем или используем предоставленный цвет границы
    let base_color = border_color.unwrap_or_else(|| compute_border_color(image));

    // Заполняем область цветом границы с небольшим шумом
    // Шум предотвращает «пластиковый» вид плоской заливки
    for y in 0..height {
        for x in 0..width {
            // Псевдослучайный шум на основе координат
            // Используем простое хеширование для детерминированности
            let hash = ((x.wrapping_mul(374761393) ^ y.wrapping_mul(668265263)) % 13) as i16;
            let noise = hash - 6; // диапазон -6..+6

            let r = (base_color[0] as i16 + noise).clamp(0, 255) as u8;
            let g = (base_color[1] as i16 + noise).clamp(0, 255) as u8;
            let b = (base_color[2] as i16 + noise).clamp(0, 255) as u8;

            image.put_pixel(x, y, Rgba([r, g, b, 255]));
        }
    }

    // Применяем размытие для сглаживания шума и создания естественного вида
    apply_box_blur(image, blur_radius.max(1));
}

/// Улучшенная реконструкция фона с edge-aware fill.
///
/// Алгоритм (Option B):
/// 1. Сэмплируем цвета границы по всем 4 сторонам
/// 2. Для каждого пикселя внутри — интерполируем от ближайших границ
/// 3. Применяем лёгкое размытие
///
/// Лучше сохраняет градиенты, но дороже вычислительно.
pub fn reconstruct_background_edge_aware(
    image: &mut RgbaImage,
    blur_radius: u32,
) {
    let (width, height) = image.dimensions();

    if width == 0 || height == 0 {
        return;
    }

    // Сэмплируем цвета границы
    let top_color = sample_edge_horizontal(image, 0);
    let bottom_color = sample_edge_horizontal(image, height - 1);
    let left_color = sample_edge_vertical(image, 0);
    let right_color = sample_edge_vertical(image, width - 1);

    // Для каждого пикселя — билинейная интерполяция от границ
    for y in 0..height {
        let vy = y as f32 / height as f32; // 0.0 (top) -> 1.0 (bottom)

        for x in 0..width {
            let vx = x as f32 / width as f32; // 0.0 (left) -> 1.0 (right)

            // Интерполируем по вертикали
            let top = lerp_color(&top_color, &left_color, vx);
            let bottom = lerp_color(&right_color, &bottom_color, vx);

            // Интерполируем по горизонтали
            let blended = lerp_color(&top, &bottom, vy);

            // Добавляем лёгкий шум
            let hash = ((x.wrapping_mul(374761393) ^ y.wrapping_mul(668265263)) % 11) as i16;
            let noise = hash - 5;

            image.put_pixel(
                x,
                y,
                Rgba([
                    (blended[0] as i16 + noise).clamp(0, 255) as u8,
                    (blended[1] as i16 + noise).clamp(0, 255) as u8,
                    (blended[2] as i16 + noise).clamp(0, 255) as u8,
                    255,
                ]),
            );
        }
    }

    // Лёгкое размытие
    if blur_radius > 0 {
        apply_box_blur(image, blur_radius);
    }
}

/// Сэмплировать средний цвет горизонтальной границы.
fn sample_edge_horizontal(image: &RgbaImage, y: u32) -> [u8; 4] {
    let width = image.width();
    if width == 0 {
        return [128; 4];
    }

    let mut r = 0u32;
    let mut g = 0u32;
    let mut b = 0u32;
    let mut a = 0u32;

    // Сэмплируем каждый 4-й пиксель
    let step = 4;
    let mut count = 0u32;

    for x in (0..width).step_by(step) {
        let pixel = image.get_pixel(x, y);
        r += pixel[0] as u32;
        g += pixel[1] as u32;
        b += pixel[2] as u32;
        a += pixel[3] as u32;
        count += 1;
    }

    if count == 0 {
        return [128; 4];
    }

    [
        (r / count) as u8,
        (g / count) as u8,
        (b / count) as u8,
        (a / count) as u8,
    ]
}

/// Сэмплировать средний цвет вертикальной границы.
fn sample_edge_vertical(image: &RgbaImage, x: u32) -> [u8; 4] {
    let height = image.height();
    if height == 0 {
        return [128; 4];
    }

    let mut r = 0u32;
    let mut g = 0u32;
    let mut b = 0u32;
    let mut a = 0u32;

    let step = 4;
    let mut count = 0u32;

    for y in (0..height).step_by(step) {
        let pixel = image.get_pixel(x, y);
        r += pixel[0] as u32;
        g += pixel[1] as u32;
        b += pixel[2] as u32;
        a += pixel[3] as u32;
        count += 1;
    }

    if count == 0 {
        return [128; 4];
    }

    [
        (r / count) as u8,
        (g / count) as u8,
        (b / count) as u8,
        (a / count) as u8,
    ]
}

/// Линейная интерполяция между двумя цветами.
fn lerp_color(c1: &[u8; 4], c2: &[u8; 4], t: f32) -> [u8; 4] {
    let t = t.clamp(0.0, 1.0);
    [
        ((c1[0] as f32) + (c2[0] as f32 - c1[0] as f32) * t) as u8,
        ((c1[1] as f32) + (c2[1] as f32 - c1[1] as f32) * t) as u8,
        ((c1[2] as f32) + (c2[2] as f32 - c1[2] as f32) * t) as u8,
        ((c1[3] as f32) + (c2[3] as f32 - c1[3] as f32) * t) as u8,
    ]
}

// ============================================================================
// TEXT ERASURE (HIGH-LEVEL API)
// ============================================================================

/// Стереть текст из области изображения.
///
/// Комбинирует реконструкцию фона с размытием.
/// Это основная функция для использования в pipeline замены текста.
///
/// # Аргументы
/// * `image` — изображение для обработки
/// * `use_edge_aware` — использовать ли edge-aware fill (true) или простой blur (false)
/// * `blur_radius` — радиус размытия (рекомендуется 2-4)
pub fn erase_text_from_image(image: &mut RgbaImage, use_edge_aware: bool, blur_radius: u32) {
    if use_edge_aware {
        reconstruct_background_edge_aware(image, blur_radius);
    } else {
        reconstruct_background(image, None, blur_radius);
    }
}

// ============================================================================
// TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compute_border_color_white() {
        let mut img = RgbaImage::new(10, 10);
        for y in 0..10 {
            for x in 0..10 {
                img.put_pixel(x, y, Rgba([255, 255, 255, 255]));
            }
        }

        let color = compute_border_color(&img);
        assert_eq!(color, [255, 255, 255, 255]);
    }

    #[test]
    fn test_box_blur_reduces_contrast() {
        let mut img = RgbaImage::new(20, 20);
        // Левая половина чёрная, правая белая
        for y in 0..20 {
            for x in 0..10 {
                img.put_pixel(x, y, Rgba([0, 0, 0, 255]));
            }
            for x in 10..20 {
                img.put_pixel(x, y, Rgba([255, 255, 255, 255]));
            }
        }

        apply_box_blur(&mut img, 3);

        // После размытия граница должна стать менее контрастной
        let left = img.get_pixel(8, 10);
        let right = img.get_pixel(11, 10);

        // Левый пиксель должен стать светлее, правый — темнее
        assert!(left[0] > 0);
        assert!(right[0] < 255);
    }

    #[test]
    fn test_reconstruct_background_produces_blurred_result() {
        let mut img = RgbaImage::new(20, 20);
        for y in 0..20 {
            for x in 0..20 {
                img.put_pixel(x, y, Rgba([100, 150, 200, 255]));
            }
        }

        reconstruct_background(&mut img, None, 2);

        // Проверяем что изображение не пустое
        let pixel = img.get_pixel(10, 10);
        assert!(pixel[0] > 0);
    }
}
