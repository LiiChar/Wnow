//! Команды для замены текста на изображениях
//!
//! Этот модуль предоставляет Tauri команды для обработки изображений
//! с полной заменой оригинального текста на переведённый.

use image::RgbaImage;
use tauri::WebviewWindow;
use tauri_plugin_log::log::{log, Level};

use crate::capture::Capture;
use crate::img::{
    ocr_word_to_translated_box, replace_text_in_image, TextReplacementParams, TranslatedBox,
};
use crate::ocr::{postprocess_ocr, preprocess_for_tesseract_sys, recognize_with_boxes, OcrWord};
use crate::translation::translate as t;
use base64::Engine;
use futures::future::join_all;

/// Параметры для обработки изображения с заменой текста
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ImageTranslationParams {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
    pub source_lang: String,
    pub target_lang: String,
    pub use_text_replacement: bool,
}

/// Результат обработки изображения
#[derive(Debug, serde::Serialize, Clone)]
pub struct ImageTranslationResult {
    pub original_text: String,
    pub translated_text: String,
    pub boxes: Vec<OcrWord>,
    pub processed_image_base64: Option<String>,
    pub stats: Option<TranslationStats>,
}

/// Статистика перевода
#[derive(Debug, serde::Serialize, Clone, Default)]
pub struct TranslationStats {
    pub boxes_processed: usize,
    pub boxes_successful: usize,
    pub avg_font_size: f32,
    pub processing_time_ms: u64,
}

/// Обработать изображение с заменой текста
///
/// Эта команда:
/// 1. Захватывает область экрана
/// 2. Выполняет OCR
/// 3. Переводит текст
/// 4. Заменяет оригинальный текст на переведённый
/// 5. Возвращает обработанное изображение в base64
#[tauri::command]
pub async fn translate_image_with_replacement(
    webview_window: WebviewWindow,
    params: ImageTranslationParams,
) -> Result<ImageTranslationResult, String> {
    let start_time = std::time::Instant::now();

    let scale = webview_window.scale_factor().unwrap_or(1.0) as f32;

    // Конвертируем в физические координаты
    let phys_x = (params.x as f32 * scale) as i32;
    let phys_y = (params.y as f32 * scale) as i32;
    let phys_w = (params.width as f32 * scale) as i32;
    let phys_h = (params.height as f32 * scale) as i32;

    // Захватываем область
    let mut capture = Capture::new();
    let buffer = capture.capture_fragment(phys_x, phys_y, phys_w, phys_h);

    // Предобработка для OCR
    let gray = preprocess_for_tesseract_sys(&buffer, phys_w as u32, phys_h as u32, 30.0);

    // Выполняем OCR
    let (original_text, boxes) = recognize_with_boxes(&gray, phys_w, phys_h, scale);
    let clear_boxes = postprocess_ocr(boxes);

    if clear_boxes.is_empty() {
        return Ok(ImageTranslationResult {
            original_text,
            translated_text: String::new(),
            boxes: vec![],
            processed_image_base64: None,
            stats: None,
        });
    }

    // Переводим текст
    let mut requests = vec![original_text.clone()];
    requests.extend(clear_boxes.iter().map(|b| b.text.clone()));

    let results = tauri::async_runtime::block_on(join_all(
        requests
            .into_iter()
            .map(|text| t(text, &params.source_lang, &params.target_lang)),
    ));

    let mut translated_text = original_text.clone();
    let mut translated_boxes: Vec<TranslatedBox> = Vec::new();
    let mut result_boxes: Vec<OcrWord> = Vec::new();

    for (i, result) in results.into_iter().enumerate() {
        if let Ok(translated) = result {
            if i == 0 {
                log!(
                    Level::Info,
                    "[translate] translated text: {}, source: {}",
                    translated,
                    original_text
                );
                translated_text = translated;
            } else {
                let b = &clear_boxes[i - 1];

                translated_boxes.push(ocr_word_to_translated_box(
                    b.x,
                    b.y,
                    b.w,
                    b.h,
                    &b.text,
                    &translated,
                ));

                result_boxes.push(OcrWord {
                    id: None,
                    x: b.x,
                    y: b.y,
                    w: b.w,
                    h: b.h,
                    text: b.text.clone(),
                    translation: Some(translated.clone()),
                });
            }
        }
    }

    // Обрабатываем изображение с заменой текста
    let mut processed_image_base64: Option<String> = None;
    let mut stats: Option<TranslationStats> = None;

    if params.use_text_replacement {
        // Конвертируем буфер в RgbaImage
        let rgba_image = RgbaImage::from_raw(phys_w as u32, phys_h as u32, buffer.clone())
            .ok_or("Failed to create image from buffer")?;

        // Параметры замены текста
        let replacement_params = TextReplacementParams {
            mask_padding: 3,
            text_padding: 4,
            overlay_alpha: 0.3,
            min_font_size: 8.0,
            max_font_size: 48.0,
            font_size_step: 0.5,
        };

        // Выполняем замену текста
        match replace_text_in_image(&rgba_image, &translated_boxes, &replacement_params) {
            Ok(result) => {
                // Конвертируем в base64
                let mut img_buffer = Vec::new();
                result
                    .image
                    .write_to(
                        &mut std::io::Cursor::new(&mut img_buffer),
                        image::ImageFormat::Png,
                    )
                    .map_err(|e| format!("Failed to encode image: {}", e))?;

                processed_image_base64 =
                    Some(base64::engine::general_purpose::STANDARD.encode(&img_buffer));

                stats = Some(TranslationStats {
                    boxes_processed: result.stats.boxes_processed,
                    boxes_successful: result.stats.boxes_successful,
                    avg_font_size: result.stats.avg_font_size,
                    processing_time_ms: result.stats.processing_time_ms,
                });

                log!(
                    Level::Info,
                    "[text_replacement] Processed {} boxes, {} successful, avg font size: {:.1}",
                    result.stats.boxes_processed,
                    result.stats.boxes_successful,
                    result.stats.avg_font_size
                );
            }
            Err(e) => {
                log!(Level::Error, "[text_replacement] Error: {}", e);
            }
        }
    }

    let total_time = start_time.elapsed().as_millis() as u64;

    log!(
        Level::Info,
        "[translate_image] Completed in {}ms, text: {} -> {}",
        total_time,
        original_text,
        translated_text
    );

    Ok(ImageTranslationResult {
        original_text,
        translated_text,
        boxes: result_boxes,
        processed_image_base64,
        stats,
    })
}

/// Упрощённая версия для быстрого перевода без обработки изображения
#[tauri::command]
pub async fn translate_fragment(
    webview_window: WebviewWindow,
    pos: (i32, i32),
    size: (i32, i32),
    source_lang: String,
    target_lang: String,
) -> Result<(String, String, Vec<OcrWord>), String> {
    let scale = webview_window.scale_factor().unwrap_or(1.0) as f32;

    let phys_x = (pos.0 as f32 * scale) as i32;
    let phys_y = (pos.1 as f32 * scale) as i32;
    let phys_w = (size.0 as f32 * scale) as i32;
    let phys_h = (size.1 as f32 * scale) as i32;

    let mut capture = Capture::new();
    let buffer = capture.capture_fragment(phys_x, phys_y, phys_w, phys_h);

    let gray = preprocess_for_tesseract_sys(&buffer, phys_w as u32, phys_h as u32, 30.0);

    let (text, boxes) = recognize_with_boxes(&gray, phys_w, phys_h, scale);
    let clear_boxes = postprocess_ocr(boxes);

    if text.trim().is_empty() && clear_boxes.is_empty() {
        return Ok((String::new(), String::new(), vec![]));
    }

    let mut requests = vec![text.clone()];
    requests.extend(clear_boxes.iter().map(|b| b.text.clone()));

    let results = tauri::async_runtime::block_on(join_all(
        requests
            .into_iter()
            .map(|text| t(text, &source_lang, &target_lang)),
    ));

    let mut translated_text = text.clone();
    let mut translated_boxes = Vec::new();

    for (i, result) in results.into_iter().enumerate() {
        if let Ok(translated) = result {
            if i == 0 {
                translated_text = translated;
            } else {
                let b = &clear_boxes[i - 1];
                translated_boxes.push(OcrWord {
                    id: None,
                    x: b.x,
                    y: b.y,
                    w: b.w,
                    h: b.h,
                    text: b.text.clone(),
                    translation: Some(translated),
                });
            }
        }
    }

    Ok((text, translated_text, translated_boxes))
}
