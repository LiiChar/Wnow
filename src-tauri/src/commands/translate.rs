use std::cell::RefCell;
use std::time::Instant;
use image::RgbaImage;
use tauri::WebviewWindow;
use tauri_plugin_log::log::{log, Level};
use crate::get_resource_dir;
use crate::ocr::{OcrWord, postprocess_ocr, preprocess_for_tesseract_sys, recognize_with_boxes};
use crate::translation::translate as t;
use crate::utils::fnv1a_hash;
use futures::future::join_all;

thread_local! {
    static CAPTURE: RefCell<Option<crate::capture::Capture>> = const { RefCell::new(None) };
}

fn with_capture<F, R>(f: F) -> Result<R, String>
where
    F: FnOnce(&mut crate::capture::Capture) -> R,
{
    CAPTURE.with(|capture_cell| {
        let mut capture_opt = capture_cell.borrow_mut();
        if capture_opt.is_none() {
            *capture_opt = Some(crate::capture::Capture::new());
        }
        let capture = capture_opt.as_mut().ok_or("Failed to get capture")?;
        Ok(f(capture))
    })
}


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

    let start = Instant::now();

    let (text, clear_boxes) = box_ocr(phys_x, phys_y, phys_w, phys_h, scale)?;

    let uniq_id = fnv1a_hash(text.as_bytes());


    log!(Level::Info, "OCR done in {}ms", start.elapsed().as_millis());
    log!(Level::Info, "OCR boxes: {} - text: {}", clear_boxes.len(), text);

    if text.trim().is_empty() && clear_boxes.is_empty() {
        return Ok(("".to_string(), vec![]));
    }

    let start = Instant::now();

    let mut requests = Vec::new();

    requests.push(text.clone());

    for b in &clear_boxes {
        requests.push(b.text.clone());
    }

    // 🔥 2. Параллельный перевод
    let futures = requests
        .into_iter()
        .map(|text| t(text, "en", "ru"));

    let results = join_all(futures).await;

    let mut translated_text = text.clone();
    let mut translated_boxes = Vec::with_capacity(clear_boxes.len());

    for (i, result) in results.into_iter().enumerate() {
        match result {
            Ok(translated) => {
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
            Err(e) => {
                log!(Level::Error, "Translation error: {:?}", e);

                if i == 0 {
                    translated_text = text.clone();
                } else {
                    let b = &clear_boxes[i - 1];

                    translated_boxes.push(OcrWord {
                        id: Some(uniq_id.to_string()),
                        x: b.x,
                        y: b.y,
                        w: b.w,
                        h: b.h,
                        text: b.text.clone(),
                        translation: Some(b.text.clone()),
                    });
                }
            }
        }
    }

    log!(
        Level::Info,
        "Translation done in {}ms",
        start.elapsed().as_millis()
    );

    Ok((translated_text, translated_boxes))
}

pub fn box_ocr(phys_x: i32, phys_y: i32, phys_w: i32, phys_h: i32, scale: f32,) -> Result<(String, Vec<OcrWord>), String> {
    let resources_path = get_resource_dir().join("screenshot");

    let buffer = with_capture(|capture| {
        capture.capture_fragment(phys_x, phys_y, phys_w, phys_h)
    })?;

    let img = preprocess_for_tesseract_sys(
        &buffer,
        phys_w as u32,
        phys_h as u32,
        30.0,
    );

    let (text, boxes) = recognize_with_boxes(&img, phys_w, phys_h, scale);
    let uniq_id = fnv1a_hash(text.clone().as_bytes());

    if let Some(debug_img) = RgbaImage::from_raw(
        phys_w as u32,
        phys_h as u32,
        buffer.clone(),
    ) {
        let _ = debug_img.save(resources_path.join(format!("debug_{}.png", uniq_id)));
    }

    let clear_boxes = postprocess_ocr(boxes);

    Ok((text, clear_boxes))
}

#[tauri::command]
pub async fn translate(text: String, source_lang: &str, target_lang: &str) -> Result<String, String> {
    t(text.clone(), source_lang, target_lang).await.or(Ok(text))
}