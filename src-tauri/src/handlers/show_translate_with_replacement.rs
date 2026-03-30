//! Обработчик показа перевода с заменой текста на изображении

use base64::Engine;
use image::RgbaImage;
use std::time::Instant;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_log::log::{log, Level};

use crate::capture::Capture;
use crate::img::{ocr_word_to_translated_box, replace_text_in_image, TextReplacementParams};
use crate::ocr::{postprocess_ocr, preprocess_for_tesseract_sys, recognize_with_boxes, OcrWord};
use crate::platform::set_window_topmost;
use crate::translation::translate;
use futures::future::join_all;

/// Показать перевод с заменой текста на изображении
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

    // Шаг 1: Захват экрана
    let start = Instant::now();
    let buffer = capture.capture_fragment(0, 0, phys_w as i32, phys_h as i32);
    log!(Level::Info, "[1] Capture: {:?}", start.elapsed());

    // Шаг 2: Предобработка для OCR
    let start = Instant::now();
    let img = preprocess_for_tesseract_sys(&buffer, phys_w, phys_h, 30.0);
    log!(Level::Info, "[2] Preprocess: {:?}", start.elapsed());

    // Шаг 3: OCR
    let start = Instant::now();
    let (_text, raw_boxes) = recognize_with_boxes(&img, phys_w as i32, phys_h as i32, scale);
    let boxes = postprocess_ocr(raw_boxes);
    log!(
        Level::Info,
        "[3] OCR: {:?}, boxes: {}",
        start.elapsed(),
        boxes.len()
    );

    if boxes.is_empty() {
        log!(Level::Info, "No text found");
        fallback_to_normal_translate(app, &[]).await;
        return;
    }

    // Шаг 4: Перевод всех боксов
    let start = Instant::now();
    let translate_requests: Vec<String> = boxes.iter().map(|b| b.text.clone()).collect();

    let results = join_all(
        translate_requests
            .iter()
            .map(|text| translate(text.clone(), "en", "ru")),
    )
    .await;

    log!(Level::Info, "[4] Translate: {:?}", start.elapsed());

    // Собираем переведённые боксы
    let mut translated_boxes = Vec::new();
    for (i, result) in results.into_iter().enumerate() {
        if let Ok(translated) = result {
            let original = &boxes[i];
            log!(
                Level::Debug,
                "Box: '{}' -> '{}' at ({}, {}, {}x{})",
                original.text,
                translated,
                original.x,
                original.y,
                original.w,
                original.h
            );
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

    // Шаг 5: Замена текста на изображении
    let start = Instant::now();

    // Конвертируем буфер в RgbaImage
    let rgba_image = match RgbaImage::from_raw(phys_w, phys_h, buffer.clone()) {
        Some(img) => img,
        None => {
            log!(Level::Error, "Failed to create RgbaImage from buffer");
            fallback_to_normal_translate(app, &boxes).await;
            return;
        }
    };

    let replacement_params = TextReplacementParams::default();

    match replace_text_in_image(&rgba_image, &translated_boxes, &replacement_params) {
        Ok(result) => {
            log!(
                Level::Info,
                "[5] Text replacement: {:?}, successful: {}/{}",
                start.elapsed(),
                result.stats.boxes_successful,
                result.stats.boxes_processed
            );

            // Конвертируем в base64
            let mut img_buffer = Vec::new();
            if let Err(e) = result.image.write_to(
                &mut std::io::Cursor::new(&mut img_buffer),
                image::ImageFormat::Png,
            ) {
                log!(Level::Error, "Failed to encode image: {}", e);
                fallback_to_normal_translate(app, &boxes).await;
                return;
            }

            let base64_image = base64::engine::general_purpose::STANDARD.encode(&img_buffer);

            log!(
                Level::Info,
                "[6] Encode: {:?}, size: {} bytes",
                start.elapsed(),
                img_buffer.len()
            );

            // Делаем overlay интерактивным
            if let Some(overlay) = app.get_webview_window("overlay") {
                overlay.set_ignore_cursor_events(false).ok();
                overlay.set_focus().ok();
                set_window_topmost(&overlay);
            }

            // Отправляем обработанное изображение
            app.emit_to(
                "overlay",
                "show_translate_with_image",
                &TranslatedImagePayload {
                    image: base64_image,
                    width: phys_w,
                    height: phys_h,
                    processing_time_ms: start_total.elapsed().as_millis() as u64,
                    boxes_count: result.stats.boxes_successful,
                },
            )
            .unwrap_or_else(|e| log!(Level::Error, "Failed to emit: {}", e));

            log!(Level::Info, "Total time: {:?}", start_total.elapsed());
        }
        Err(e) => {
            log!(Level::Error, "Text replacement failed: {}", e);
            fallback_to_normal_translate(app, &boxes).await;
        }
    }
}

/// Fallback: обычное отображение боксов если замена текста не удалась
async fn fallback_to_normal_translate(app: &AppHandle, boxes: &[OcrWord]) {
    log!(Level::Info, "Falling back to normal translate");

    if let Some(overlay) = app.get_webview_window("overlay") {
        overlay.set_ignore_cursor_events(false).ok();
        overlay.set_focus().ok();
        set_window_topmost(&overlay);
    }

    app.emit_to("overlay", "show_translate", boxes)
        .expect("Failed to emit show_translate");
}

/// Payload для отправки обработанного изображения
#[derive(serde::Serialize, Clone, Debug)]
pub struct TranslatedImagePayload {
    pub image: String,
    pub width: u32,
    pub height: u32,
    pub processing_time_ms: u64,
    pub boxes_count: usize,
}
