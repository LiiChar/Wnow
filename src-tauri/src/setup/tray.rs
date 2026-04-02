use crate::platform::set_window_topmost;
use tauri::{AppHandle, Emitter, Manager};

/// Настройка системного трея с современным дизайном
pub fn setup_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    use tauri::image::Image;
    use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};

    // 🔍 Основные действия
    let translate_word_i = MenuItem::with_id(
        app,
        "translate_word",
        "Перевести слово под курсором",
        true,
        Some("Ctrl+U"),
    )?;
    
    let translate_area_i = MenuItem::with_id(
        app,
        "translate_area",
        "Перевести выделенную область",
        true,
        Some("Ctrl+Y"),
    )?;
    
    let translate_screen_i = MenuItem::with_id(
        app,
        "translate_screen",
        "Перевести весь экран",
        true,
        Some("Ctrl+T"),
    )?;

    // 📋 Буфер обмена
    let translate_clipboard_i = MenuItem::with_id(
        app,
        "translate_clipboard",
        "Перевести текст из буфера",
        true,
        Some("Ctrl+Shift+C"),
    )?;

    let separator_actions = PredefinedMenuItem::separator(app)?;

    // 📚 Словарь и изучение
    let open_dict_i = MenuItem::with_id(
        app,
        "open",
        "Открыть словарь",
        true,
        None::<&str>,
    )?;

    let separator_dict = PredefinedMenuItem::separator(app)?;

    // ⚙️ Настройки и система
    let check_updates_i = MenuItem::with_id(
        app,
        "check_updates",
        "Проверить обновления",
        true,
        None::<&str>,
    )?;

    let report_issue_i = MenuItem::with_id(
        app,
        "report_issue",
        "Сообщить об ошибке",
        true,
        None::<&str>,
    )?;

    let separator_settings = PredefinedMenuItem::separator(app)?;

    // 🚪 Выход
    let quit_i = MenuItem::with_id(
        app,
        "quit",
        "Выход",
        true,
        Some("Alt+F4"),
    )?;

    let menu = Menu::with_items(
        app,
        &[
            &translate_word_i,
            &translate_area_i,
            &translate_screen_i,
            &translate_clipboard_i,
            &separator_actions,
            &open_dict_i,
            // &separator_dict,
            // &check_updates_i,
            // &report_issue_i,
            &separator_settings,
            &quit_i,
        ],
    )?;

    // Загружаем иконку из встроенных ресурсов
    let icon_bytes = include_bytes!("../../icons/icon.ico");
    let icon = Image::from_bytes(icon_bytes).expect("Failed to load tray icon");

    tauri::tray::TrayIconBuilder::new()
        .icon(icon)
        .icon_as_template(true) // Адаптивная иконка под тему системы
        .tooltip("Wnow — Переводчик экрана\nКлик — меню, Двойной клик — словарь")
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
                "translate_screen" => {
                    // Перевод всего экрана
                    if let Some(overlay) = app_handle.get_webview_window("overlay") {
                        overlay.set_ignore_cursor_events(false).ok();
                        overlay.set_focus().ok();
                        set_window_topmost(&overlay);
                    }
                    app_handle.emit_to("overlay", "translate_full_screen", ()).ok();
                }
                "translate_clipboard" => {
                    // Перевод текста из буфера
                    let app_clone = app_handle.clone();
                    std::thread::spawn(move || {
                        let rt = tokio::runtime::Runtime::new().unwrap();
                        rt.block_on(crate::handlers::translate_selected_text(&app_clone));
                    });
                }
                "check_updates" => {
                    // TODO: Реализовать проверку обновений
                    println!("Проверка обновлений...");
                }
                "report_issue" => {
                    // Открываем GitHub issues в браузере
                    let _ = tauri_plugin_opener::open_url("https://github.com/your-repo/wnow/issues", None::<&str>);
                }
                "quit" => {
                    app_handle.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            match event {
                // Двойной клик — открываем словарь
                tauri::tray::TrayIconEvent::DoubleClick { .. } => {
                    let app_handle = tray.app_handle();
                    if let Some(window) = app_handle.get_webview_window("main") {
                        window.show().ok();
                        window.set_focus().ok();
                    }
                }
                _ => {}
            }
        })
        .build(app)?;

    Ok(())
}
