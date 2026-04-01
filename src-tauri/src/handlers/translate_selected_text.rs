use crate::{mouse::Mouse, translation::local::get_translate_lang};
use crate::ocr::OcrWord;
use crate::platform::set_window_topmost;
use crate::translation::translate;
use crate::utils::fnv1a_hash;
use enigo::{Enigo, Key, Keyboard, Settings};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_log::log::{log, Level};

/// Перевод выделенного текста (без изменения буфера обмена пользователя)
pub async fn translate_selected_text(app: &AppHandle) {
    let clipboard = app.clipboard();

    let (source_lang, target_lang) = get_translate_lang();

    // 1. Сохраняем оригинальное содержимое буфера обмена
    let original_clipboard = clipboard.read_text().ok();

    // 2. Симулируем Ctrl+C для копирования выделенного текста
    {
        let mut enigo = match Enigo::new(&Settings::default()) {
            Ok(e) => e,
            Err(e) => {
                log!(Level::Error, "Failed to create Enigo: {:?}", e);
                return;
            }
        };

        // Нажимаем Ctrl+C
        if let Err(e) = enigo.key(Key::Control, enigo::Direction::Press) {
            log!(Level::Error, "Failed to press Ctrl: {:?}", e);
        }
        if let Err(e) = enigo.key(Key::Unicode('c'), enigo::Direction::Click) {
            log!(Level::Error, "Failed to press C: {:?}", e);
        }
        if let Err(e) = enigo.key(Key::Control, enigo::Direction::Release) {
            log!(Level::Error, "Failed to release Ctrl: {:?}", e);
        }
    }

    // 3. Небольшая задержка для обновления буфера обмена
    thread::sleep(Duration::from_millis(150));

    // 4. Читаем скопированный текст
    let selected_text = match clipboard.read_text() {
        Ok(text) => text,
        Err(e) => {
            log!(Level::Error, "Failed to read selected text: {:?}", e);
            // Восстанавливаем оригинальный буфер
            if let Some(orig) = original_clipboard {
                clipboard.write_text(orig).ok();
            }
            return;
        }
    };

    // 5. Восстанавливаем оригинальное содержимое буфера обмена
    if let Some(orig) = original_clipboard {
        clipboard.write_text(orig).ok();
    } else {
        // Если буфер был пуст, очищаем его
        clipboard.write_text(String::new()).ok();
    }

    let text = selected_text.trim();
    if text.is_empty() {
        log!(Level::Info, "No text selected");
        return;
    }

    let uniq_id = fnv1a_hash(text.as_bytes());

    log!(
        Level::Info,
        "Translating selected text: '{}'",
        &text[..text.len().min(50)]
    );

    // 6. Переводим текст
    let translation = match translate(text.to_string(), &source_lang, &target_lang).await {
        Ok(t) => t,
        Err(e) => {
            log!(Level::Error, "Translation error: {:?}", e);
            format!("[Ошибка перевода: {}]", e)
        }
    };

    // Получаем позицию мыши для показа popup
    let mouse = Mouse::new();
    let (phys_x, phys_y) = mouse.get_position();
    let scale = app
        .get_webview_window("overlay")
        .map(|w| w.scale_factor().unwrap_or(1.0) as f32)
        .unwrap_or(1.0);
    let logical_x = (phys_x as f32 / scale) as i32;
    let logical_y = (phys_y as f32 / scale) as i32;

    let result = vec![OcrWord {
        id: Some(uniq_id.to_string()),
        text: text.to_string(),
        translation: Some(translation),
        x: logical_x,
        y: logical_y,
        w: 0,
        h: 0,
        image: None
    }];

    if let Some(window) = app.get_webview_window("overlay") {
        window.set_ignore_cursor_events(false).ok();
        window.set_focus().ok();
        set_window_topmost(&window);
    }

    app.emit_to("overlay", "show_translate", &result).ok();
}
