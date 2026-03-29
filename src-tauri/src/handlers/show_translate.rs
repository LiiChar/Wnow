use std::time::Instant;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_log::log::{log, Level};
use crate::capture::Capture;
use crate::ocr::{preprocess_for_tesseract_sys, recognize_with_boxes};
use crate::platform::set_window_topmost;

pub async fn show_translate(app: &AppHandle) {
    let scale = app
        .get_webview_window("overlay")
        .unwrap()
        .scale_factor()
        .unwrap_or(1.0) as f32;
    let mut capture = Capture::new();
    // capture.get_capture_size() возвращает физические пиксели
    let (phys_w, phys_h) = capture.get_capture_size();

    let start = Instant::now();
    let buffer = capture.capture_fragment(0, 0, phys_w as i32, phys_h as i32);
    let duration = start.elapsed();
    log!(
        Level::Info,
        "Eval duration capture fragment is {:#?}",
        duration
    );

    let start = Instant::now();
    let img = preprocess_for_tesseract_sys(&buffer, phys_w, phys_h, 30.0);
    let duration = start.elapsed();
    log!(Level::Info, "Eval duration preprocess is {:#?}", duration);

    let start = Instant::now();
    let (_text, boxes) = recognize_with_boxes(&img, phys_w as i32, phys_h as i32, scale);
    let duration = start.elapsed();
    log!(Level::Info, "Eval duration ocr is {:#?}", duration);

    // Делаем overlay интерактивным и поверх всех окон
    if let Some(overlay) = app.get_webview_window("overlay") {
        overlay.set_ignore_cursor_events(false).ok();
        overlay.set_focus().ok();
        set_window_topmost(&overlay);
    }

    app.emit_to("overlay", "show_translate", &boxes)
        .expect("Failed send data by emit:show_translate");
}
