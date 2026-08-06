use crate::capture::Capture;
use crate::commands::database::get_settings;
use crate::img::{TextReplacementParams, ocr_word_to_translated_box, replace_text_in_image};
use crate::storage::Database;
use crate::translation::local::get_translate_lang;
use crate::get_resource_dir;
use crate::ocr::{postprocess_ocr, preprocess_for_tesseract_sys, recognize_with_boxes, OcrWord};
use crate::translation::{translate as t, translate_ordered_fragments_with_context};
use crate::utils::fnv1a_hash;
use base64::Engine;
use futures::future::join_all;
use image::RgbaImage;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Instant;
use tauri::{Emitter, WebviewWindow};
use tauri_plugin_log::log::{log, Level};

/// Переиспользуемый буфер для PNG-кодирования (избегаем аллокаций на каждый фрагмент)
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

    /// Закодировать изображение в PNG → base64, переиспользуя внутренний буфер.
    fn encode_to_base64(&mut self, image: &RgbaImage) -> Result<String, String> {
        self.clear();
        image
            .write_to(&mut std::io::Cursor::new(&mut self.buffer), image::ImageFormat::Png)
            .map_err(|e| format!("PNG encode error: {}", e))?;
        Ok(base64::engine::general_purpose::STANDARD.encode(&self.buffer))
    }
}

static FLOATING_TRANSLATE_RUNNING: once_cell::sync::Lazy<Arc<AtomicBool>> =
    once_cell::sync::Lazy::new(|| Arc::new(AtomicBool::new(false)));

#[tauri::command]
pub fn get_block_translate(
    webview_window: WebviewWindow,
    pos: (i32, i32),
    size: (i32, i32),
) -> Result<(String, Vec<OcrWord>), String> {
    let scale = webview_window.scale_factor().unwrap_or(1.0) as f32;

    let phys_x = (pos.0 as f32 * scale) as i32;
    let phys_y = (pos.1 as f32 * scale) as i32;
    let phys_w = (size.0 as f32 * scale) as i32;
    let phys_h = (size.1 as f32 * scale) as i32;

    let (source_lang, target_lang) = get_translate_lang();

    let mut capture = Capture::new();

    let (text, clear_boxes) = box_ocr(&mut capture, phys_x, phys_y, phys_w, phys_h, scale)?;

    if text.trim().is_empty() && clear_boxes.is_empty() {
        return Ok(("".to_string(), vec![]));
    }

    let uniq_id = fnv1a_hash(text.as_bytes());

    let translated_text = match tauri::async_runtime::block_on(t(
        text.clone(),
        &source_lang,
        &target_lang,
    )) {
        Ok(s) => {
            log!(
                Level::Info,
                "[translate] translated text: {}, source: {}",
                s,
                text.clone()
            );
            s
        }
        Err(_) => text.clone(),
    };

    let mut sorted_ix: Vec<usize> = (0..clear_boxes.len()).collect();
    sorted_ix.sort_by_key(|&i| (clear_boxes[i].y, clear_boxes[i].x));
    let ordered_texts: Vec<String> = sorted_ix.iter().map(|&i| clear_boxes[i].text.clone()).collect();

    let line_translations: Vec<String> = match tauri::async_runtime::block_on(
        translate_ordered_fragments_with_context(
            ordered_texts,
            &source_lang,
            &target_lang,
        ),
    ) {
        Ok(v) if v.len() == sorted_ix.len() => v,
        _ => tauri::async_runtime::block_on(join_all(
            sorted_ix.iter().map(|&i| {
                t(
                    clear_boxes[i].text.clone(),
                    &source_lang,
                    &target_lang,
                )
            }),
        ))
        .into_iter()
        .filter_map(|r| r.ok())
        .collect(),
    };

    let mut translated_boxes = Vec::with_capacity(sorted_ix.len());

    for (ord, &i) in sorted_ix.iter().enumerate() {
        let translated = line_translations
            .get(ord)
            .cloned()
            .unwrap_or_else(|| clear_boxes[i].text.clone());
        let b = &clear_boxes[i];

        translated_boxes.push(OcrWord {
            id: Some(uniq_id.to_string()),
            x: b.x,
            y: b.y,
            w: b.w,
            h: b.h,
            text: b.text.clone(),
            translation: Some(translated),
            image: None,
        });
    }

    Ok((translated_text, translated_boxes))
}

#[tauri::command]
pub fn get_block_image_translate(
    webview_window: WebviewWindow,
    pos: (i32, i32),
    size: (i32, i32),
) -> Result<(String, Vec<OcrWord>), String> {
    let scale = webview_window.scale_factor().unwrap_or(1.0) as f32;

    let phys_x = (pos.0 as f32 * scale) as i32;
    let phys_y = (pos.1 as f32 * scale) as i32;
    let phys_w = (size.0 as f32 * scale) as i32;
    let phys_h = (size.1 as f32 * scale) as i32;

    let (source_lang, target_lang) = get_translate_lang();

    let mut capture = Capture::new();

    // 1. OCR
    let (text, clear_boxes) = box_ocr(&mut capture, phys_x, phys_y, phys_w, phys_h, scale)?;

    if text.trim().is_empty() && clear_boxes.is_empty() {
        return Ok(("".to_string(), vec![]));
    }

    let uniq_id = fnv1a_hash(text.as_bytes());

    // 2. Перевод (целый текст + строки с межстрочным контекстом)
    let translated_text = match tauri::async_runtime::block_on(t(
        text.clone(),
        &source_lang,
        &target_lang,
    )) {
        Ok(s) => {
            log!(
                Level::Info,
                "[translate] translated text: {}, source: {}",
                s,
                text
            );
            s
        }
        Err(_) => text.clone(),
    };

    let mut sorted_ix: Vec<usize> = (0..clear_boxes.len()).collect();
    sorted_ix.sort_by_key(|&i| (clear_boxes[i].y, clear_boxes[i].x));
    let ordered_texts: Vec<String> = sorted_ix.iter().map(|&i| clear_boxes[i].text.clone()).collect();

    let line_translations: Vec<String> = match tauri::async_runtime::block_on(
        translate_ordered_fragments_with_context(
            ordered_texts,
            &source_lang,
            &target_lang,
        ),
    ) {
        Ok(v) if v.len() == sorted_ix.len() => v,
        _ => tauri::async_runtime::block_on(join_all(
            sorted_ix.iter().map(|&i| {
                t(
                    clear_boxes[i].text.clone(),
                    &source_lang,
                    &target_lang,
                )
            }),
        ))
        .into_iter()
        .filter_map(|r| r.ok())
        .collect(),
    };

    let mut translated_boxes: Vec<crate::img::TranslatedBox> = Vec::with_capacity(sorted_ix.len());

    for (ord, &i) in sorted_ix.iter().enumerate() {
        let translated = line_translations
            .get(ord)
            .cloned()
            .unwrap_or_else(|| clear_boxes[i].text.clone());
        let b = &clear_boxes[i];
        translated_boxes.push(ocr_word_to_translated_box(
            b.x,
            b.y,
            b.w,
            b.h,
            &b.text,
            &translated,
        ));
    }

    if translated_boxes.is_empty() {
        return Ok((translated_text, vec![]));
    }

    // 3. Захват изображения (один раз)
    let buffer = capture.capture_fragment(pos.0, pos.1, size.0, size.1);
    let rgba_image = RgbaImage::from_raw(size.0 as u32, size.1 as u32, buffer)
        .ok_or("Failed to create RgbaImage from captured buffer")?;

    // 4. Batch-обработка: все боксы за один проход
    let replacement_params = TextReplacementParams::default();
    let result = replace_text_in_image(&rgba_image, &translated_boxes, &replacement_params)
        .map_err(|e| format!("Text replacement error: {}", e))?;

    // 5. Извлекаем фрагменты из обработанного изображения
    let processed = &result.image;
    let mut png_buffer = PngEncodeBuffer::with_capacity(rgba_image.width() as usize * rgba_image.height() as usize * 4);
    let mut fragments = Vec::with_capacity(translated_boxes.len());

    for (idx, tb) in translated_boxes.iter().enumerate() {
        // Координаты относительно захваченного изображения (уже корректные)
        let x = tb.x.max(0) as u32;
        let y = tb.y.max(0) as u32;
        let w = tb.width.max(0) as u32;
        let h = tb.height.max(0) as u32;

        if w == 0 || h == 0 {
            continue;
        }

        // Вырезаем фрагмент из ЕДИНОГО обработанного изображения
        let fragment = crop_fragment(processed, x, y, w, h);

        // ⚠️ Каждый бокс получает УНИКАЛЬНЫЙ id (uniq_id + индекс)
        let box_id = format!("{}_{}", uniq_id, idx);

        match png_buffer.encode_to_base64(&fragment) {
            Ok(base64_image) => {
                fragments.push(OcrWord {
                    id: Some(box_id),
                    x: tb.x,
                    y: tb.y,
                    w: tb.width,
                    h: tb.height,
                    text: tb.original_text.clone(),
                    translation: Some(tb.translated_text.clone()),
                    image: Some(base64_image),
                });
            }
            Err(e) => {
                log!(Level::Error, "[get_block_image_translate] PNG encode error: {}", e);
            }
        }
    }

    // Логируем статистику
    log!(
        Level::Info,
        "[text_replacement] Processed {} boxes, {} successful, avg font size: {:.1}, time: {}ms",
        result.stats.boxes_processed,
        result.stats.boxes_successful,
        result.stats.avg_font_size,
        result.stats.processing_time_ms
    );

    Ok((translated_text, fragments))
}

/// Вырезать фрагмент из изображения с проверкой границ.
fn crop_fragment(image: &RgbaImage, x: u32, y: u32, w: u32, h: u32) -> RgbaImage {
    let (img_w, img_h) = image.dimensions();

    // Clamp координат и размеров
    let x = x.min(img_w);
    let y = y.min(img_h);
    let w = w.min(img_w - x);
    let h = h.min(img_h - y);

    if w == 0 || h == 0 {
        return RgbaImage::new(1, 1);
    }

    image::imageops::crop_imm(image, x, y, w, h).to_image()
}




#[tauri::command]
pub async fn start_floating_image_translate(
    webview_window: WebviewWindow,
    pos: (i32, i32),
    size: (i32, i32),
) -> Result<(), String> {
    if FLOATING_TRANSLATE_RUNNING.load(Ordering::Relaxed) {
        return Ok(());
    }

    let delay = Database::get_setting("floating_delay").unwrap_or("1000".to_string()).parse::<i32>().unwrap_or(1000);

    let (source_lang, target_lang) = get_translate_lang();

    FLOATING_TRANSLATE_RUNNING.store(true, Ordering::Relaxed);
    let running = FLOATING_TRANSLATE_RUNNING.clone();

    tauri::async_runtime::spawn_blocking(move || {
        let scale = webview_window.scale_factor().unwrap_or(1.0) as f32;

        let phys_x = (pos.0 as f32 * scale) as i32;
        let phys_y = (pos.1 as f32 * scale) as i32;
        let phys_w = (size.0 as f32 * scale) as i32;
        let phys_h = (size.1 as f32 * scale) as i32;

        let mut capture = Capture::new();
        let mut png_buffer = PngEncodeBuffer::with_capacity(1024 * 1024); // 1MB начальный буфер
        let replacement_params = TextReplacementParams::default();

        while running.load(Ordering::Relaxed) {
            let start = std::time::Instant::now();

            if let Ok((text, clear_boxes)) =
                box_ocr(&mut capture, phys_x, phys_y, phys_w, phys_h, scale)
            {
                if text.trim().is_empty() && clear_boxes.is_empty() {
                    std::thread::sleep(std::time::Duration::from_secs(2));
                    continue;
                }

                let uniq_id = fnv1a_hash(text.as_bytes());

                let translated_text = match tauri::async_runtime::block_on(t(
                    text.clone(),
                    &source_lang,
                    &target_lang,
                )) {
                    Ok(s) => s,
                    Err(_) => text.clone(),
                };

                let mut sorted_ix: Vec<usize> = (0..clear_boxes.len()).collect();
                sorted_ix.sort_by_key(|&i| (clear_boxes[i].y, clear_boxes[i].x));
                let ordered_texts: Vec<String> =
                    sorted_ix.iter().map(|&i| clear_boxes[i].text.clone()).collect();

                let line_translations: Vec<String> = match tauri::async_runtime::block_on(
                    translate_ordered_fragments_with_context(
                        ordered_texts,
                        &source_lang,
                        &target_lang,
                    ),
                ) {
                    Ok(v) if v.len() == sorted_ix.len() => v,
                    _ => tauri::async_runtime::block_on(join_all(
                        sorted_ix.iter().map(|&i| {
                            t(
                                clear_boxes[i].text.clone(),
                                &source_lang,
                                &target_lang,
                            )
                        }),
                    ))
                    .into_iter()
                    .filter_map(|r| r.ok())
                    .collect(),
                };

                let mut translated_boxes: Vec<crate::img::TranslatedBox> =
                    Vec::with_capacity(sorted_ix.len());

                for (ord, &i) in sorted_ix.iter().enumerate() {
                    let translated = line_translations
                        .get(ord)
                        .cloned()
                        .unwrap_or_else(|| clear_boxes[i].text.clone());
                    let b = &clear_boxes[i];
                    translated_boxes.push(ocr_word_to_translated_box(
                        b.x,
                        b.y,
                        b.w,
                        b.h,
                        &b.text,
                        &translated,
                    ));
                }

                // Захват изображения
                let buffer = capture.capture_fragment(pos.0, pos.1, size.0, size.1);
                let rgba_image = match RgbaImage::from_raw(size.0 as u32, size.1 as u32, buffer) {
                    Some(img) => img,
                    None => {
                        log!(Level::Error, "[floating] Failed to create RgbaImage");
                        continue;
                    }
                };

                // Batch-обработка: все боксы за один проход
                let result = match replace_text_in_image(&rgba_image, &translated_boxes, &replacement_params) {
                    Ok(r) => r,
                    Err(e) => {
                        log!(Level::Error, "[floating] Text replacement error: {}", e);
                        continue;
                    }
                };

                // Извлекаем фрагменты
                let processed = &result.image;
                let mut fragments = Vec::with_capacity(translated_boxes.len());

                for (idx, tb) in translated_boxes.iter().enumerate() {
                    let x = tb.x.max(0) as u32;
                    let y = tb.y.max(0) as u32;
                    let w = tb.width.max(0) as u32;
                    let h = tb.height.max(0) as u32;

                    if w == 0 || h == 0 {
                        continue;
                    }

                    let fragment = crop_fragment(processed, x, y, w, h);

                    // ⚠️ Уникальный ID для каждого бокса
                    let box_id = format!("{}_{}", uniq_id, idx);

                    if let Ok(base64_image) = png_buffer.encode_to_base64(&fragment) {
                        fragments.push(OcrWord {
                            id: Some(box_id),
                            x: tb.x,
                            y: tb.y,
                            w: tb.width,
                            h: tb.height,
                            text: tb.original_text.clone(),
                            translation: Some(tb.translated_text.clone()),
                            image: Some(base64_image),
                        });
                    }
                }

                let _ = webview_window.emit_to(
                    "overlay",
                    "floating_translate",
                    (translated_text, fragments),
                );
            }

            std::thread::sleep(std::time::Duration::from_millis(delay as u64));

            log!(Level::Debug, "[floating] tick {}ms", start.elapsed().as_millis());
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn start_floating_translate(
    webview_window: WebviewWindow,
    pos: (i32, i32),
    size: (i32, i32),
) -> Result<(), String> {
    if FLOATING_TRANSLATE_RUNNING.load(Ordering::Relaxed) {
        return Ok(());
    }

    let (source_lang, target_lang) = get_translate_lang();

    FLOATING_TRANSLATE_RUNNING.store(true, Ordering::Relaxed);
    let running = FLOATING_TRANSLATE_RUNNING.clone();

    tauri::async_runtime::spawn_blocking(move || {
        let scale = webview_window.scale_factor().unwrap_or(1.0) as f32;

        let phys_x = (pos.0 as f32 * scale) as i32;
        let phys_y = (pos.1 as f32 * scale) as i32;
        let phys_w = (size.0 as f32 * scale) as i32;
        let phys_h = (size.1 as f32 * scale) as i32;

        let mut capture = Capture::new();

        while running.load(Ordering::Relaxed) {
            let start = std::time::Instant::now();

            if let Ok((text, clear_boxes)) =
                box_ocr(&mut capture, phys_x, phys_y, phys_w, phys_h, scale)
            {
                if text.trim().is_empty() && clear_boxes.is_empty() {
                    std::thread::sleep(std::time::Duration::from_secs(2));
                    continue;
                }

                let uniq_id = fnv1a_hash(text.as_bytes());

                let mut requests = vec![text.clone()];
                requests.extend(clear_boxes.iter().map(|b| b.text.clone()));

                // ⚠️ тут блокирующий runtime
                let results = tauri::async_runtime::block_on(join_all(
                    requests.into_iter().map(|text| t(text, &source_lang, &target_lang)),
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
                                id: Some(uniq_id.to_string()),
                                x: b.x,
                                y: b.y,
                                w: b.w,
                                h: b.h,
                                text: b.text.clone(),
                                translation: Some(translated),
                                image: None
                            });
                        }
                    }
                }

                let _ = webview_window.emit_to(
                    "overlay",
                    "floating_translate",
                    (translated_text, translated_boxes),
                );
            }

            // ⏱ задержка
            std::thread::sleep(std::time::Duration::from_micros(200));

            println!("tick {}ms", start.elapsed().as_millis());
        }
    });

    Ok(())
}

pub fn box_ocr(
    capture: &mut Capture,
    phys_x: i32,
    phys_y: i32,
    phys_w: i32,
    phys_h: i32,
    scale: f32,
) -> Result<(String, Vec<OcrWord>), String> {
    let buffer = capture.capture_fragment(phys_x, phys_y, phys_w, phys_h);

    let img = preprocess_for_tesseract_sys(&buffer, phys_w as u32, phys_h as u32, 30.0);

    let (text, boxes) = recognize_with_boxes(&img, phys_w, phys_h, scale);

    // ⚠️ DEBUG (ограниченный)
    #[cfg(debug_assertions)]
    {
        use std::sync::atomic::{AtomicUsize, Ordering};
        static COUNT: AtomicUsize = AtomicUsize::new(0);

        if COUNT.fetch_add(1, Ordering::Relaxed) < 3 {
            if let Some(debug_img) = RgbaImage::from_raw(
                phys_w as u32,
                phys_h as u32,
                buffer.clone(), // можно оставить только в debug
            ) {
                let _ = debug_img.save(
                    get_resource_dir().join("screenshot").join(format!("debug_{}.png", fnv1a_hash(text.as_bytes()))),
                );
            }
        }
    }

    let clear_boxes = postprocess_ocr(boxes);

    Ok((text, clear_boxes))
}

#[tauri::command]
pub fn stop_floating_translate() {
    FLOATING_TRANSLATE_RUNNING.store(false, Ordering::Relaxed);
}

#[tauri::command]
pub async fn translate(
    text: String,
    source_lang: &str,
    target_lang: &str,
) -> Result<String, String> {
    t(text.clone(), source_lang, target_lang).await.or(Ok(text))
}
