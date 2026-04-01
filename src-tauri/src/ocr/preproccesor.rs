pub fn preprocess_for_tesseract_sys(
    pixels: &[u8],
    width: u32,
    height: u32,
    contrast: f32,
) -> Vec<u8> {
    let factor = (259.0 * (contrast + 255.0)) / (255.0 * (259.0 - contrast));
    
    let mut gray = Vec::with_capacity(pixels.len() / 4);

    for chunk in pixels.chunks_exact(4) {
        let r = chunk[0] as f32;
        let g = chunk[1] as f32;
        let b = chunk[2] as f32;

        let lum = 0.299 * r + 0.587 * g + 0.114 * b;
        let val = factor * (lum - 128.0) + 128.0;

        gray.push(val.clamp(0.0, 255.0) as u8);
    }

    gray
}

pub fn preprocess_for_rapid_ocr(pixels: &[u8], width: u32, height: u32, contrast: f32) -> Vec<u8> {
    let w = width as usize;
    let h = height as usize;
    let len = w * h;

    // 1. Grayscale + контраст
    let factor = (259.0 * (contrast + 255.0)) / (255.0 * (259.0 - contrast));
    let mut gray = vec![0u8; len];
    for y in 0..h {
        for x in 0..w {
            let idx = (y * w + x) * 4;
            let r = pixels[idx] as f32;
            let g = pixels[idx + 1] as f32;
            let b = pixels[idx + 2] as f32;
            let lum = 0.299 * r + 0.587 * g + 0.114 * b;
            let val = factor * (lum - 128.0) + 128.0;
            gray[y * w + x] = val.clamp(0.0, 255.0) as u8;
        }
    }

    // 2. Простая бинаризация
    let threshold = 128u8;
    for i in 0..len {
        gray[i] = if gray[i] > threshold { 255 } else { 0 };
    }

    // 3. Легкое шумоподавление (3x3 median filter)
    let mut filtered = gray.clone();
    for y in 1..h - 1 {
        for x in 1..w - 1 {
            let mut neighbors = [
                gray[(y - 1) * w + (x - 1)],
                gray[(y - 1) * w + x],
                gray[(y - 1) * w + (x + 1)],
                gray[y * w + (x - 1)],
                gray[y * w + x],
                gray[y * w + (x + 1)],
                gray[(y + 1) * w + (x - 1)],
                gray[(y + 1) * w + x],
                gray[(y + 1) * w + (x + 1)],
            ];
            neighbors.sort_unstable();
            filtered[y * w + x] = neighbors[4]; // медиана
        }
    }

    // 4. Добавляем 1px padding (для Tesseract / RapidOCR это полезно)
    let mut padded = vec![255u8; (w + 2) * (h + 2)];
    for y in 0..h {
        for x in 0..w {
            padded[(y + 1) * (w + 2) + (x + 1)] = filtered[y * w + x];
        }
    }

    padded
}
