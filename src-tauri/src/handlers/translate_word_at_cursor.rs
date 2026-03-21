use std::time::Instant;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_log::log::{log, Level};
use crate::capture::Capture;
use crate::ocr::{recognize_with_boxes, OcrWord};
use crate::capture::preprocess_for_tesseract_sys;
use crate::translation::translate;
use crate::platform::set_window_topmost;
use crate::mouse::Mouse;
use crate::WordTranslation;

/// Перевод слова под курсором
pub async fn translate_word_at_cursor(app: &AppHandle) {
    let scale = app
        .get_webview_window("overlay")
        .unwrap()
        .scale_factor()
        .unwrap_or(1.0) as f32;

    // enigo возвращает ФИЗИЧЕСКИЕ координаты мыши на Windows
    let mouse = Mouse::new();
    let (phys_mouse_x, phys_mouse_y) = mouse.get_position();

    // Конвертируем в логические для фронтенда
    let logical_mouse_x = (phys_mouse_x as f32 / scale) as i32;
    let logical_mouse_y = (phys_mouse_y as f32 / scale) as i32;

    log!(
        Level::Info,
        "Mouse phys: ({}, {}), logical: ({}, {}), scale: {}",
        phys_mouse_x,
        phys_mouse_y,
        logical_mouse_x,
        logical_mouse_y,
        scale
    );

    // Размер области вокруг курсора для захвата (в физических пикселях)
    let phys_radius = 200;

    let mut capture = Capture::new();
    let (screen_w, screen_h) = capture.get_capture_size();

    // Область захвата в физических пикселях
    let capture_x = (phys_mouse_x - phys_radius).max(0);
    let capture_y = (phys_mouse_y - phys_radius).max(0);
    let capture_w = (phys_radius * 2).min(screen_w as i32 - capture_x);
    let capture_h = (phys_radius * 2).min(screen_h as i32 - capture_y);

    log!(
        Level::Info,
        "Capture area phys: ({}, {}, {}x{})",
        capture_x,
        capture_y,
        capture_w,
        capture_h
    );

    let start = Instant::now();
    let buffer = capture.capture_fragment(capture_x, capture_y, capture_w, capture_h);
    log!(Level::Info, "Capture duration: {:?}", start.elapsed());

    let start = Instant::now();
    let img = preprocess_for_tesseract_sys(&buffer, capture_w as u32, capture_h as u32, 30.0);
    log!(Level::Info, "Preprocess duration: {:?}", start.elapsed());

    let start = Instant::now();
    // OCR возвращает координаты в логических пикселях (делит на scale внутри)
    let (_full_text, raw_boxes) = recognize_with_boxes(&img, capture_w, capture_h, scale);
    log!(Level::Info, "OCR duration: {:?}", start.elapsed());
    log!(Level::Info, "Raw boxes count: {}", raw_boxes.len());

    // Минимальная фильтрация
    let boxes: Vec<OcrWord> = raw_boxes
        .into_iter()
        .filter(|b| {
            let text = b.text.trim();
            text.len() >= 1 && text.chars().any(|c| c.is_alphabetic())
        })
        .collect();

    // Позиция мыши относительно области захвата (в логических пикселях)
    let capture_x_logical = (capture_x as f32 / scale) as i32;
    let capture_y_logical = (capture_y as f32 / scale) as i32;
    let local_mouse_x = logical_mouse_x - capture_x_logical;
    let local_mouse_y = logical_mouse_y - capture_y_logical;

    log!(
        Level::Info,
        "Local mouse: ({}, {}), boxes count: {}",
        local_mouse_x,
        local_mouse_y,
        boxes.len()
    );

    // Дебаг: выводим первые 5 боксов
    for (i, b) in boxes.iter().take(5).enumerate() {
        log!(
            Level::Info,
            "Box {}: '{}' at ({}, {}, {}x{})",
            i,
            b.text,
            b.x,
            b.y,
            b.w,
            b.h
        );
    }

    // Ищем слово под курсором
    let word_under_cursor = boxes.iter().find(|b| {
        let in_x = local_mouse_x >= b.x && local_mouse_x <= b.x + b.w;
        let in_y = local_mouse_y >= b.y && local_mouse_y <= b.y + b.h;
        in_x && in_y
    });

    // Если не нашли точное попадание, ищем ближайшее слово
    let word = word_under_cursor.cloned().or_else(|| {
        boxes
            .iter()
            .min_by_key(|b| {
                let cx = b.x + b.w / 2;
                let cy = b.y + b.h / 2;
                ((local_mouse_x - cx).pow(2) + (local_mouse_y - cy).pow(2)) as i32
            })
            .cloned()
    });

    if let Some(ref w) = word {
        log!(
            Level::Info,
            "Selected word: '{}' at local ({}, {})",
            w.text,
            w.x,
            w.y
        );
    }

    if boxes.is_empty() {
        log!(Level::Info, "No text found in capture area");
        let result = WordTranslation {
            word: String::new(),
            translation: "Текст не найден".to_string(),
            context: String::new(),
            context_translation: String::new(),
            popup_x: logical_mouse_x,
            popup_y: (logical_mouse_y - 60).max(10),
            word_x: logical_mouse_x - 20,
            word_y: logical_mouse_y - 10,
            word_w: 40,
            word_h: 20,
        };

        if let Some(window) = app.get_webview_window("overlay") {
            window.set_ignore_cursor_events(false).ok();
            window.set_focus().ok();
            set_window_topmost(&window);
        }

        app.emit_to("overlay", "translate_word", &result).ok();
        return;
    }

    if let Some(word_box) = word {
        let word_text = word_box.text.trim().to_string();
        log!(
            Level::Info,
            "Found word: '{}' at local ({}, {})",
            word_text,
            word_box.x,
            word_box.y
        );

        // Переводим слово
        let translation =
            match translate(word_text.clone(), "en", "ru").await {
            Ok(t) => t,
            Err(e) => {
                log!(Level::Error, "Translation error: {:?}", e);
                format!("[{}]", word_text)
            }
        };

        // Контекст - все слова на той же строке
        let context: String = boxes
            .iter()
            .filter(|b| {
                let center_y = word_box.y + word_box.h / 2;
                b.y <= center_y && b.y + b.h >= center_y
            })
            .map(|b| b.text.trim())
            .collect::<Vec<_>>()
            .join(" ");

        // Переводим контекст если больше одного слова
        let word_count = context.split_whitespace().count();
        let context_translation = if word_count > 1 {
            translate(context.clone(), "en", "ru")
                .await
                .unwrap_or_default()
        } else {
            String::new()
        };

        // Абсолютные координаты слова (в логических пикселях для фронтенда)
        let abs_word_x = capture_x_logical + word_box.x;
        let abs_word_y = capture_y_logical + word_box.y;

        // Popup над словом
        let popup_x = abs_word_x + word_box.w / 2;
        let popup_y = abs_word_y - 50;

        let result = WordTranslation {
            word: word_text,
            translation,
            context,
            context_translation,
            popup_x,
            popup_y: popup_y.max(10),
            word_x: abs_word_x,
            word_y: abs_word_y,
            word_w: word_box.w,
            word_h: word_box.h,
        };

        log!(
            Level::Info,
            "Result: word at ({}, {}) {}x{}",
            result.word_x,
            result.word_y,
            result.word_w,
            result.word_h
        );

        if let Some(window) = app.get_webview_window("overlay") {
            window.set_ignore_cursor_events(false).ok();
            window.set_focus().ok();
            set_window_topmost(&window);
        }

        app.emit_to("overlay", "translate_word", &result)
            .expect("Failed to emit translate_word");
    } else {
        log!(
            Level::Info,
            "No word found under cursor (boxes: {})",
            boxes.len()
        );
    }
}
