use image::GrayImage;
use imageproc::{contrast::otsu_level, filter::gaussian_blur_f32};

/// Предобработка ARGB для OCR
/// Возвращает Vec<u8> в grayscale
pub fn preprocess_argb_to_vec(
    pixels: &[u8],
    width: u32,
    height: u32,
    contrast_factor: f32,
    apply_threshold: bool, // true = бинаризация по Otsu
) -> GrayImage {
    let mut gray = Vec::with_capacity((width * height) as usize);

    for y in 0..height {
        for x in 0..width {
            let idx = ((y * width + x) * 4) as usize;
            let r = pixels[idx] as f32;
            let g = pixels[idx + 1] as f32;
            let b = pixels[idx + 2] as f32;

            let lum = (0.299 * r + 0.587 * g + 0.114 * b) as u8;
            gray.push(lum);
        }
    }

    // Контраст
    let factor = (259.0 * (contrast_factor + 255.0)) / (255.0 * (259.0 - contrast_factor));
    for px in gray.iter_mut() {
        let val = factor * (*px as f32 - 128.0) + 128.0;
        *px = val.clamp(0.0, 255.0) as u8;
    }

    // Threshold по Otsu
    let threshold = otsu_level(&GrayImage::from_vec(width, height, gray.clone()).unwrap());
    for px in gray.iter_mut() {
        *px = if *px > threshold { 255 } else { 0 };
    }
    GrayImage::from_vec(width, height, gray).unwrap()
}

pub fn preprocess_argb(pixels: &[u8], width: u32, height: u32, contrast_factor: f32) -> GrayImage {
    let len = (width * height) as usize;
    let mut gray = vec![0u8; len];

    let factor = (259.0 * (contrast_factor + 255.0)) / (255.0 * (259.0 - contrast_factor));

    // 1 проход: grayscale + contrast
    for i in 0..len {
        let idx = i * 4;

        let r = pixels[idx] as f32;
        let g = pixels[idx + 1] as f32;
        let b = pixels[idx + 2] as f32;

        let lum = 0.299 * r + 0.587 * g + 0.114 * b;
        let val = factor * (lum - 128.0) + 128.0;

        gray[i] = val.clamp(0.0, 255.0) as u8;
    }

    // Otsu
    let t = otsu_threshold_fast(&gray);

    // Threshold inplace
    for px in gray.iter_mut() {
        *px = if *px > t { 255 } else { 0 };
    }

    GrayImage::from_vec(width, height, gray).unwrap()
}

fn otsu_threshold_fast(gray: &[u8]) -> u8 {
    let mut hist = [0u32; 256];

    for &v in gray {
        hist[v as usize] += 1;
    }

    let total = gray.len() as f32;
    let mut sum = 0.0;
    for i in 0..256 {
        sum += (i as f32) * hist[i] as f32;
    }

    let mut sum_b = 0.0;
    let mut w_b = 0.0;
    let mut max_var = 0.0;
    let mut threshold = 0;

    for i in 0..256 {
        w_b += hist[i] as f32;
        if w_b == 0.0 {
            continue;
        }

        let w_f = total - w_b;
        if w_f == 0.0 {
            break;
        }

        sum_b += (i as f32) * hist[i] as f32;

        let m_b = sum_b / w_b;
        let m_f = (sum - sum_b) / w_f;

        let var_between = w_b * w_f * (m_b - m_f).powi(2);

        if var_between > max_var {
            max_var = var_between;
            threshold = i;
        }
    }

    threshold as u8
}

pub fn preprocess_for_tesseract(
    pixels: &[u8],
    width: u32,
    height: u32,
    contrast: f32,
) -> GrayImage {
    let len = (width * height) as usize;
    let mut gray = vec![0u8; len];

    let factor = (259.0 * (contrast + 255.0)) / (255.0 * (259.0 - contrast));

    for i in 0..len {
        let idx = i * 4;

        let r = pixels[idx] as f32;
        let g = pixels[idx + 1] as f32;
        let b = pixels[idx + 2] as f32;

        let lum = 0.299 * r + 0.587 * g + 0.114 * b;
        let val = factor * (lum - 128.0) + 128.0;

        gray[i] = val.clamp(0.0, 255.0) as u8;
    }

    GrayImage::from_vec(width, height, gray).unwrap()
}

pub fn preprocess_for_tesseract_sys(
    pixels: &[u8],
    width: u32,
    height: u32,
    contrast: f32,
) -> Vec<u8> {
    let len = (width * height) as usize;
    let mut gray = vec![0u8; len];

    // contrast: [-255..255] обычно
    let factor = (259.0 * (contrast + 255.0)) / (255.0 * (259.0 - contrast));

    for i in 0..len {
        let idx = i * 4;

        let r = pixels[idx] as f32;
        let g = pixels[idx + 1] as f32;
        let b = pixels[idx + 2] as f32;

        // luminance
        let lum = 0.299 * r + 0.587 * g + 0.114 * b;

        // contrast
        let val = factor * (lum - 128.0) + 128.0;

        gray[i] = val.clamp(0.0, 255.0) as u8;
    }

    gray
}
