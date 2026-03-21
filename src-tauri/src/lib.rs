mod capture;
mod commands;
mod handlers;
mod img;
mod mouse;
mod ocr;
mod platform;
mod setup;
mod source;
mod storage;
mod translation;
mod utils;

use serde::Serialize;
use tauri::Manager;
use tauri::Emitter;
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};

pub use handlers::{show_translate, translate_word_at_cursor, translate_selected_text};
pub use platform::set_window_topmost;
pub use utils::{init_resource_dir, get_resource_dir};

use crate::setup::register_shortcut_handler;

/// Данные для popup с переводом слова
#[derive(Debug, Clone, Serialize)]
pub struct WordTranslation {
    pub word: String,
    pub translation: String,
    pub context: String,
    pub context_translation: String,
    // Позиция popup
    pub popup_x: i32,
    pub popup_y: i32,
    // Позиция и размер слова на экране (для обводки)
    pub word_x: i32,
    pub word_y: i32,
    pub word_w: i32,
    pub word_h: i32,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let ctrl_t = Shortcut::new(Some(Modifiers::CONTROL), Code::KeyT);
    let ctrl_y = Shortcut::new(Some(Modifiers::CONTROL), Code::KeyY);
    let ctrl_u = Shortcut::new(Some(Modifiers::CONTROL), Code::KeyU);
    let _ctrl_shift_c = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyC);
    let esc = Shortcut::new(Some(Modifiers::all()), Code::Escape);

    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if shortcut == &ctrl_y {
                        match event.state() {
                            ShortcutState::Released => {
                                println!("translate_fragment");
                                // Делаем overlay интерактивным и поверх всех окон
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
                    if shortcut == &ctrl_t {
                        match event.state() {
                            ShortcutState::Released => {
                                let app_clone = app.clone();
                                std::thread::spawn(move || {
                                    let rt = tokio::runtime::Runtime::new().unwrap();
                                    rt.block_on(show_translate(&app_clone));
                                });
                            }
                            _ => {}
                        }
                    }
                    if shortcut == &ctrl_u {
                        match event.state() {
                            ShortcutState::Released => {
                                let app_clone = app.clone();
                                std::thread::spawn(move || {
                                    let rt = tokio::runtime::Runtime::new().unwrap();
                                    rt.block_on(translate_word_at_cursor(&app_clone));
                                });
                            }
                            _ => {}
                        }
                    }
                    // if shortcut == &ctrl_shift_c {
                    //     match event.state() {
                    //         ShortcutState::Released => {
                    //             let app_clone = app.clone();
                    //             std::thread::spawn(move || {
                    //                 let rt = tokio::runtime::Runtime::new().unwrap();
                    //                 rt.block_on(translate_selected_text(&app_clone));
                    //             });
                    //         }
                    //         _ => {}
                    //     }
                    // }
                    if shortcut == &esc {
                        match event.state() {
                            ShortcutState::Released => {
                                app.emit_to("overlay", "close_popup", ()).ok();
                                if let Some(w) = app.get_webview_window("overlay") {
                                    w.set_ignore_cursor_events(true).ok();
                                }
                            }
                            _ => {}
                        }
                    }
                })
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_log::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::common::set_clickthrough,
            commands::common::get_mouse_position,
            commands::common::quick_translate,
            commands::common::batch_translate,
            commands::database::add_word_to_study,
            commands::database::get_all_words,
            commands::database::get_words_for_study,
            commands::database::update_word_progress,
            commands::database::delete_word,
            commands::database::get_learning_stats,
            commands::database::get_settings,
            commands::database::save_settings,
            commands::translate::get_block_translate,
            commands::translation::set_translation_mode,
            commands::translation::get_current_translation_mode,
            commands::translation::get_translation_models,
            commands::translation::is_model_available
        ])
        .setup(move |app| {
            init_resource_dir(&app.handle());
            register_shortcut_handler(&app.handle());
            setup::setup_database(&app.handle());

            setup::setup_overlay_window(&app.handle());
            setup::setup_main_window(&app.handle());

            setup::setup_tray(&app.handle())?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
