use crate::capture::Capture;
use crate::get_resource_dir;
use crate::ocr::{postprocess_ocr, preprocess_for_tesseract_sys, recognize_with_boxes, OcrWord};
use crate::translation::translate as t;
use crate::utils::fnv1a_hash;
use futures::future::join_all;
use image::RgbaImage;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Instant;
use tauri::{Emitter, WebviewWindow};
use tauri_plugin_log::log::{log, Level};

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

    let mut capture = Capture::new();

    let (text, clear_boxes) = box_ocr(&mut capture, phys_x, phys_y, phys_w, phys_h, scale)?;

    if text.trim().is_empty() && clear_boxes.is_empty() {
        return Ok(("".to_string(), vec![]));
    }

    let uniq_id = fnv1a_hash(text.as_bytes());

    let mut requests = vec![text.clone()];
    requests.extend(clear_boxes.iter().map(|b| b.text.clone()));

    // 👇 блокируем async внутри sync функции
    let results = tauri::async_runtime::block_on(join_all(
        requests.into_iter().map(|text| t(text, "en", "ru")),
    ));

    let mut translated_text = text.clone();
    let mut translated_boxes = Vec::with_capacity(clear_boxes.len());

    for (i, result) in results.into_iter().enumerate() {
        if let Ok(translated) = result {
            if i == 0 {
                log!(
                    Level::Info,
                    "[translate] translated text: {}, source: {}",
                    translated,
                    text.clone()
                );
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
                });
            }
        }
    }

    Ok((translated_text, translated_boxes))
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
                    requests.into_iter().map(|text| t(text, "en", "ru")),
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
            std::thread::sleep(std::time::Duration::from_secs(2));

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
                    get_resource_dir().join(format!("debug_{}.png", fnv1a_hash(text.as_bytes()))),
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
