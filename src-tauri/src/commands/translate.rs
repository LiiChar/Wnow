use std::time::Instant;
use tauri::{WebviewWindow};
use tauri_plugin_log::log::{log, Level};
use crate::capture::Capture;
use crate::ocr::{recognize_with_boxes, postprocess_ocr, OcrWord};
use crate::capture::preprocess_for_tesseract_sys;
use crate::translation::translate;

#[tauri::command]
pub async fn get_block_translate(
    webview_window: WebviewWindow,
    pos: (i32, i32),
    size: (i32, i32),
) -> Result<(String, Vec<OcrWord>), String> {
    let scale = webview_window.scale_factor().unwrap_or(1.0) as f32;

    let phys_x = (pos.0 as f32 * scale) as i32;
    let phys_y = (pos.1 as f32 * scale) as i32;
    let phys_w = (size.0 as f32 * scale) as i32;
    let phys_h = (size.1 as f32 * scale) as i32;


    let (text, clear_boxes) = box_ocr(phys_x, phys_y, phys_w, phys_h, scale);

    if text.trim().is_empty() && clear_boxes.is_empty() {
        return Ok(("".to_string(), vec![]));
    }

    let start = Instant::now();

    let separator = "===";
    
    let mut combined = String::new();
    combined.push_str(&text);
    combined.push_str(separator);

    for b in &clear_boxes {
        combined.push_str(&b.text);
        combined.push_str(separator);
    }

    let translated = match translate(combined, "en", "ru").await {
        Ok(t) => t,
        Err(e) => {
            log!(Level::Error, "Translation error: {:?}", e);
            return Ok((text, clear_boxes));
        }
    };

    let parts: Vec<&str> = translated.split(separator).collect();

    let translated_text = parts.get(0).map_or(text.as_str(), |v| v).to_string();

    let mut translated_boxes = Vec::with_capacity(clear_boxes.len());

    for (i, b) in clear_boxes.iter().enumerate() {
        let translated_word = parts
            .get(i + 1)
            .unwrap_or(&b.text.as_str())
            .trim()
            .to_string();

        translated_boxes.push(OcrWord {
            x: b.x,
            y: b.y,
            w: b.w,
            h: b.h,
            text: b.text.clone(),
            translation: Some(translated_word)
        });
    }

    log!(
        Level::Info,
        "Translation: {}ms, parts: {}",
        start.elapsed().as_millis(),
        parts.len()
    );

    Ok((translated_text, translated_boxes))
}

pub fn box_ocr(phys_x: i32, phys_y: i32, phys_w: i32, phys_h: i32, scale: f32,) -> (String, Vec<OcrWord>) {
    let mut capture = Capture::new();

    let buffer = capture.capture_fragment(phys_x, phys_y, phys_w, phys_h);

    let img = preprocess_for_tesseract_sys(
        &buffer,
        phys_w as u32,
        phys_h as u32,
        30.0,
    );

    let (text, boxes) = recognize_with_boxes(&img, phys_w, phys_h, scale);

    let clear_boxes = postprocess_ocr(boxes);

    (text, clear_boxes)
}