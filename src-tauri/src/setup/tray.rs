use crate::platform::set_window_topmost;
use tauri::{AppHandle, Emitter, Manager};

/// Настройка системного трея
pub fn setup_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    use tauri::image::Image;
    use tauri::menu::{Menu, MenuItem};

    let open_i = MenuItem::with_id(app, "open", "📚 Открыть словарь", true, None::<&str>)?;
    let translate_word_i = MenuItem::with_id(
        app,
        "translate_word",
        "🔍 Перевести слово (Ctrl+U)",
        true,
        None::<&str>,
    )?;
    let translate_area_i = MenuItem::with_id(
        app,
        "translate_area",
        "📐 Выделить область (Ctrl+Y)",
        true,
        None::<&str>,
    )?;
    let separator = MenuItem::with_id(app, "sep", "─────────────", false, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", "❌ Выход", true, None::<&str>)?;
    let menu = Menu::with_items(
        app,
        &[
            &open_i,
            &translate_word_i,
            &translate_area_i,
            &separator,
            &quit_i,
        ],
    )?;

    // Загружаем иконку из встроенных ресурсов (работает и в dev и в release)
    let icon_bytes = include_bytes!("../../icons/icon.ico");
    let icon = Image::from_bytes(icon_bytes).expect("Failed to load tray icon");

    tauri::tray::TrayIconBuilder::new()
        .icon(icon)
        .tooltip("Wnow - Переводчик экрана")
        .menu(&menu)
        .on_menu_event(move |app_handle: &tauri::AppHandle, event| {
            match event.id().0.as_str() {
                "open" => {
                    // Открываем main окно (словарь)
                    if let Some(window) = app_handle.get_webview_window("main") {
                        window.show().ok();
                        window.set_focus().ok();
                    }
                }
                "translate_word" => {
                    // Используем overlay для перевода
                    if let Some(overlay) = app_handle.get_webview_window("overlay") {
                        overlay.set_ignore_cursor_events(false).ok();
                        overlay.set_focus().ok();
                        set_window_topmost(&overlay);
                    }
                    app_handle
                        .emit_to("overlay", "trigger_translate_word", ())
                        .ok();
                }
                "translate_area" => {
                    // Используем overlay для выделения области
                    if let Some(overlay) = app_handle.get_webview_window("overlay") {
                        overlay.set_ignore_cursor_events(false).ok();
                        overlay.set_focus().ok();
                        set_window_topmost(&overlay);
                    }
                    app_handle.emit_to("overlay", "translate_fragment", ()).ok();
                }
                "quit" => {
                    app_handle.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let tauri::tray::TrayIconEvent::DoubleClick { .. } = event {
                // Двойной клик - открываем main окно
                let app_handle = tray.app_handle();
                if let Some(window) = app_handle.get_webview_window("main") {
                    window.show().ok();
                    window.set_focus().ok();
                }
            }
        })
        .build(app)?;

    Ok(())
}
