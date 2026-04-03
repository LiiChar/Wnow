use base64::Engine;
use futures::future::join_all;
use image::RgbaImage;
use std::time::Instant;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_log::log::{log, Level};

use crate::capture::Capture;
use crate::img::{ocr_word_to_translated_box, replace_text_in_image, TextReplacementParams, TranslatedBox};
use crate::ocr::{postprocess_ocr, preprocess_for_tesseract_sys, recognize_with_boxes, OcrWord};
use crate::platform::set_window_topmost;
use crate::translation::local::get_translate_lang;
use crate::translation::translate;

/// Один фрагмент (картинка + позиция)
#[derive(serde::Serialize, Clone, Debug)]
pub struct TranslatedFragment {
    pub image: String,
    pub x: i32,
    pub y: i32,
    pub w: i32,
    pub h: i32,
}

/// Payload с фрагментами
#[derive(serde::Serialize, Clone, Debug)]
pub struct TranslatedFragmentsPayload {
    pub fragments: Vec<TranslatedFragment>,
    pub processing_time_ms: u64,
}

/// Переиспользуемый буфер для PNG-кодирования
struct PngEncodeBuffer {
    buffer: Vec<u8>,
}

impl PngEncodeBuffer {
    fn with_capacity(cap: usize) -> Self {
        Self {
            buffer: Vec::with_capacity(cap),
        }
    }

    fn clear(&mut self) {
        self.buffer.clear();
    }

    fn encode_to_base64(&mut self, image: &RgbaImage) -> Result<String, String> {
        self.clear();
        image
            .write_to(&mut std::io::Cursor::new(&mut self.buffer), image::ImageFormat::Png)
            .map_err(|e| format!("PNG encode error: {}", e))?;
        Ok(base64::engine::general_purpose::STANDARD.encode(&self.buffer))
    }
}

/// Вырезать фрагмент с проверкой границ
fn crop_fragment(image: &RgbaImage, x: u32, y: u32, w: u32, h: u32) -> RgbaImage {
    let (img_w, img_h) = image.dimensions();
    let x = x.min(img_w);
    let y = y.min(img_h);
    let w = w.min(img_w - x);
    let h = h.min(img_h - y);

    if w == 0 || h == 0 {
        return RgbaImage::new(1, 1);
    }

    image::imageops::crop_imm(image, x, y, w, h).to_image()
}

/// Основная функция
pub async fn show_translate_with_replacement(app: &AppHandle) {
    let start_total = Instant::now();

    let scale = app
        .get_webview_window("overlay")
        .unwrap()
        .scale_factor()
        .unwrap_or(1.0) as f32;

    let mut capture = Capture::new();
    let (phys_w, phys_h) = capture.get_capture_size();

    log!(Level::Info, "Capture size: {}x{}", phys_w, phys_h);

    // 1. Capture
    let buffer = capture.capture_fragment(0, 0, phys_w as i32, phys_h as i32);

    // 2. Preprocess
    let img = preprocess_for_tesseract_sys(&buffer, phys_w, phys_h, 30.0);

    // 3. OCR
    let (_text, raw_boxes) = recognize_with_boxes(&img, phys_w as i32, phys_h as i32, scale);
    let boxes = postprocess_ocr(raw_boxes);

    if boxes.is_empty() {
        fallback_to_normal_translate(app, &[]).await;
        return;
    }

    // 4. Translate
    let translate_requests: Vec<String> = boxes.iter().map(|b| b.text.clone()).collect();

    let (source_lang, target_lang) = get_translate_lang();

    let results = join_all(
        translate_requests
            .iter()
            .map(|text| translate(text.clone(), &source_lang, &target_lang)),
    )
    .await;

    let mut translated_boxes: Vec<TranslatedBox> = Vec::with_capacity(boxes.len());

    for (i, result) in results.into_iter().enumerate() {
        if let Ok(translated) = result {
            let original = &boxes[i];
            translated_boxes.push(ocr_word_to_translated_box(
                original.x,
                original.y,
                original.w,
                original.h,
                &original.text,
                &translated,
            ));
        }
    }

    if translated_boxes.is_empty() {
        fallback_to_normal_translate(app, &boxes).await;
        return;
    }

    // 5. Создаём RgbaImage из буфера
    let rgba_image = match RgbaImage::from_raw(phys_w, phys_h, buffer) {
        Some(img) => img,
        None => {
            fallback_to_normal_translate(app, &boxes).await;
            return;
        }
    };

    // 6. Batch-обработка: все боксы за один проход на полном изображении
    let replacement_params = TextReplacementParams::default();
    let result = match replace_text_in_image(&rgba_image, &translated_boxes, &replacement_params) {
        Ok(r) => r,
        Err(e) => {
            log!(Level::Error, "[show_translate_with_replacement] Replacement error: {}", e);
            fallback_to_normal_translate(app, &boxes).await;
            return;
        }
    };

    // 7. Извлекаем фрагменты из ЕДИНОГО обработанного изображения
    let processed = &result.image;
    let mut png_buffer = PngEncodeBuffer::with_capacity(phys_w as usize * phys_h as usize * 4);
    let mut fragments = Vec::with_capacity(translated_boxes.len());

    for tb in &translated_boxes {
        let x = tb.x.max(0) as u32;
        let y = tb.y.max(0) as u32;
        let w = tb.width.max(0) as u32;
        let h = tb.height.max(0) as u32;

        if w == 0 || h == 0 {
            continue;
        }

        let fragment = crop_fragment(processed, x, y, w, h);

        if let Ok(base64_image) = png_buffer.encode_to_base64(&fragment) {
            fragments.push(TranslatedFragment {
                image: base64_image,
                x: tb.x,
                y: tb.y,
                w: tb.width,
                h: tb.height,
            });
        }
    }

    log!(
        Level::Info,
        "Fragments: {}, replacement time: {}ms, total: {:?}, avg font: {:.1}",
        fragments.len(),
        result.stats.processing_time_ms,
        start_total.elapsed(),
        result.stats.avg_font_size
    );

    // Overlay активируем
    if let Some(overlay) = app.get_webview_window("overlay") {
        overlay.set_ignore_cursor_events(false).ok();
        overlay.set_focus().ok();
        set_window_topmost(&overlay);
    }

    // 8. Отправка
    app.emit_to(
        "overlay",
        "show_translate_fragments",
        &TranslatedFragmentsPayload {
            fragments,
            processing_time_ms: start_total.elapsed().as_millis() as u64,
        },
    )
    .unwrap_or_else(|e| log!(Level::Error, "Failed to emit: {}", e));
}

/// fallback
async fn fallback_to_normal_translate(app: &AppHandle, boxes: &[OcrWord]) {
    log!(Level::Info, "Fallback to normal translate");

    if let Some(overlay) = app.get_webview_window("overlay") {
        overlay.set_ignore_cursor_events(false).ok();
        overlay.set_focus().ok();
        set_window_topmost(&overlay);
    }

    app.emit_to("overlay", "show_translate", boxes)
        .unwrap_or_else(|e| log!(Level::Error, "Failed to emit show_translate: {}", e));
}