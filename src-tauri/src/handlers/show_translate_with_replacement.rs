use base64::Engine;
use futures::future::join_all;
use image::RgbaImage;
use std::time::Instant;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_log::log::{log, Level};

use crate::capture::Capture;
use crate::img::{ocr_word_to_translated_box, replace_text_in_image, TextReplacementParams};
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

    let mut translated_boxes = Vec::new();

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

    // 5. Работа с изображением
    let rgba_image = match RgbaImage::from_raw(phys_w, phys_h, buffer.clone()) {
        Some(img) => img,
        None => {
            fallback_to_normal_translate(app, &boxes).await;
            return;
        }
    };

    let replacement_params = TextReplacementParams::default();
    let mut fragments = Vec::new();

    // 🔥 Главный цикл — делаем куски
    for tb in &translated_boxes {
        // 1. Вырезаем кусок
        let sub_image = image::imageops::crop_imm(
            &rgba_image,
            tb.x as u32,
            tb.y as u32,
            tb.width as u32,
            tb.height as u32,
        )
        .to_image();

        // 2. Делаем локальный бокс (ВАЖНО)
        let local_box = ocr_word_to_translated_box(
            0,
            0,
            tb.width,
            tb.height,
            &tb.original_text,
            &tb.translated_text,
        );

        // 3. Заменяем текст внутри куска
        match replace_text_in_image(&sub_image, &[local_box], &replacement_params) {
            Ok(result) => {
                let mut img_buffer = Vec::new();

                if result
                    .image
                    .write_to(
                        &mut std::io::Cursor::new(&mut img_buffer),
                        image::ImageFormat::Png,
                    )
                    .is_ok()
                {
                    let base64_image =
                        base64::engine::general_purpose::STANDARD.encode(&img_buffer);

                    fragments.push(TranslatedFragment {
                        image: base64_image,
                        x: tb.x,
                        y: tb.y,
                        w: tb.width,
                        h: tb.height,
                    });
                }
            }
            Err(e) => {
                log!(Level::Error, "Fragment replace failed: {}", e);
            }
        }
    }

    log!(
        Level::Info,
        "Fragments created: {}, total time: {:?}",
        fragments.len(),
        start_total.elapsed()
    );

    // Overlay активируем
    if let Some(overlay) = app.get_webview_window("overlay") {
        overlay.set_ignore_cursor_events(false).ok();
        overlay.set_focus().ok();
        set_window_topmost(&overlay);
    }

    // 6. Отправка
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
        .expect("Failed to emit show_translate");
}