mod capture;
mod commands;
mod handlers;
mod img;
mod mouse;
mod notification;
mod ocr;
mod platform;
mod setup;
mod source;
mod storage;
mod translation;
mod utils;
mod windows;

use std::sync::{Arc, Mutex};

use tauri::Emitter;
use tauri::Manager;
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState as GlobalShortcutState};

pub use handlers::{
    show_translate, show_translate_with_replacement, translate_selected_text,
    translate_word_at_cursor,
};
pub use platform::set_window_topmost;
pub use utils::{get_resource_dir, init_resource_dir};
pub use windows::windows::create_main_window;

use crate::commands::translate::stop_floating_translate;
use crate::setup::register_shortcuts_from_settings;
use crate::storage::AppSettings;
use crate::utils::parse_hotkey;
use crate::windows::windows::create_notification_window;
use crate::windows::windows::create_overlay_window;

/// Хранит текущие шорткаты для динамического обновления
pub struct ActiveShortcuts {
    pub translate_screen: Shortcut,
    pub translate_area: Shortcut,
    pub translate_word: Shortcut,
    pub translate_clipboard: Shortcut,
    pub close_translate: Shortcut,
}

impl ActiveShortcuts {
    pub fn from_settings(settings: &AppSettings) -> Self {
        Self {
            translate_screen: parse_hotkey(&settings.hotkey_translate_screen)
                .unwrap_or_else(|| Shortcut::new(Some(Modifiers::CONTROL), Code::KeyT)),
            translate_area: parse_hotkey(&settings.hotkey_translate_area)
                .unwrap_or_else(|| Shortcut::new(Some(Modifiers::CONTROL), Code::KeyY)),
            translate_word: parse_hotkey(&settings.hotkey_translate_word)
                .unwrap_or_else(|| Shortcut::new(Some(Modifiers::CONTROL), Code::KeyU)),
            translate_clipboard: parse_hotkey(&settings.hotkey_translate_clipboard)
                .unwrap_or_else(|| Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyC)),
            close_translate: Shortcut::new(Some(Modifiers::CONTROL), Code::KeyI),
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler({
                    move |app, shortcut, event| {
                        // Пытаемся получить состояние шорткатов, если оно ещё не инициализировано - игнорируем
                        let state_result = app.try_state::<std::sync::Arc<std::sync::Mutex<ActiveShortcuts>>>();
                        if let Some(state_arc) = state_result {
                            let state = state_arc.lock().unwrap();
                            
                            if shortcut == &state.translate_area {
                                match event.state() {
                                    GlobalShortcutState::Released => {
                                        if let Some(overlay) = app.get_webview_window("overlay") {
                                            overlay.set_ignore_cursor_events(false).ok();
                                            overlay.set_focus().ok();
                                            set_window_topmost(&overlay);
                                        }
                                        app.emit_to("overlay", "translate_fragment", ())
                                            .expect("Failed send data by emit:show_translate");
                                    }
                                    _ => {}
                                }
                            }
                            if shortcut == &state.translate_word {
                                match event.state() {
                                    GlobalShortcutState::Released => {
                                        let app_clone = app.clone();
                                        std::thread::spawn(move || {
                                            let rt = tokio::runtime::Runtime::new().unwrap();
                                            rt.block_on(translate_word_at_cursor(&app_clone));
                                        });
                                    }
                                    _ => {}
                                }
                            }
                            if shortcut == &state.translate_clipboard {
                                match event.state() {
                                    GlobalShortcutState::Released => {
                                        let app_clone = app.clone();
                                        std::thread::spawn(move || {
                                            let rt = tokio::runtime::Runtime::new().unwrap();
                                            rt.block_on(translate_selected_text(&app_clone));
                                        });
                                    }
                                    _ => {}
                                }
                            }
                            if shortcut == &state.close_translate {
                                match event.state() {
                                    GlobalShortcutState::Released => {
                                        app.emit_to("overlay", "close_translate", ()).ok();
                                        stop_floating_translate();
                                    }
                                    _ => {}
                                }
                            }
                        }
                    }
                })
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_log::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::common::log,
            commands::common::set_clickthrough,
            commands::common::get_mouse_position,
            commands::common::quick_translate,
            commands::common::batch_translate,
            commands::model::download_model,
            commands::model::get_model_list,
            commands::model::get_available_models,
            commands::monitor::get_monitors,
            commands::monitor::get_main_monitor,
            commands::database::add_word_to_study,
            commands::database::get_all_words,
            commands::database::get_words_for_study,
            commands::database::update_word_progress,
            commands::database::delete_word,
            commands::database::clear_all_words,
            commands::database::get_learning_stats,
            commands::database::get_settings,
            commands::database::save_settings,
            commands::translate::translate,
            commands::translate::get_block_translate,
            commands::translate::get_block_image_translate,
            commands::translate::stop_floating_translate,
            commands::translate::start_floating_translate,
            commands::translate::start_floating_image_translate,
            commands::translation::set_translation_mode,
            commands::translation::get_current_translation_mode,
            commands::translation::get_translation_models,
            commands::translation::is_model_available,
            commands::notification::show_notification,
            commands::text_replacement::translate_image_with_replacement,
            commands::text_replacement::translate_fragment,
        ])
        .setup(move |app| {
            // let window = app.get_webview_window("main").unwrap();
            init_resource_dir(&app.handle());
            
            // Сначала инициализируем базу данных
            setup::setup_database(&app.handle());
            
            // Загружаем настройки из БД и инициализируем шорткаты
            let settings = crate::storage::Database::get_all_settings();
            let shortcut_state = ActiveShortcuts::from_settings(&settings);
            let shortcut_state_arc = Arc::new(Mutex::new(shortcut_state));
            app.manage(shortcut_state_arc);
            
            // Регистрируем шорткаты из настроек
            register_shortcuts_from_settings(&app.handle(), &settings);

            setup::setup_overlay_window(&app.handle());
            setup::setup_main_window(&app.handle());
            setup::setup_notification_window(&app.handle());

            setup::setup_tray(&app.handle())?;

            create_main_window(&app.handle())?;
            create_overlay_window(&app.handle())?;
            create_notification_window(&app.handle())?;

            use tauri_plugin_notification::NotificationExt;
            app.notification()
                .builder()
                .title("Tauri")
                .body("Tauri is awesome")
                .show()
                .unwrap();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
