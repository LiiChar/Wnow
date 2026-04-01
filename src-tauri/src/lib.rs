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

use tauri::Emitter;
use tauri::Manager;
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};

pub use handlers::{
    show_translate, show_translate_with_replacement, translate_selected_text,
    translate_word_at_cursor,
};
pub use platform::set_window_topmost;
pub use utils::{get_resource_dir, init_resource_dir};
pub use windows::windows::create_main_window;

use crate::commands::common::start_global_mouse_stream;
use crate::commands::translate::stop_floating_translate;
use crate::setup::register_shortcut_handler;
use crate::windows::windows::create_notification_window;
use crate::windows::windows::create_overlay_window;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let ctrl_t = Shortcut::new(Some(Modifiers::CONTROL), Code::KeyT);
    let ctrl_y = Shortcut::new(Some(Modifiers::CONTROL), Code::KeyY);
    let ctrl_u = Shortcut::new(Some(Modifiers::CONTROL), Code::KeyU);
    let ctrl_i = Shortcut::new(Some(Modifiers::CONTROL), Code::KeyI);
    let ctrl_shift_c = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyC);

    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if shortcut == &ctrl_y {
                        match event.state() {
                            ShortcutState::Released => {
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
                    // if shortcut == &ctrl_t {
                    //     match event.state() {
                    //         ShortcutState::Released => {
                    //             let app_clone = app.clone();
                    //             std::thread::spawn(move || {
                    //                 let rt = tokio::runtime::Runtime::new().unwrap();
                    //                 rt.block_on(show_translate_with_replacement(&app_clone));
                    //             });
                    //         }
                    //         _ => {}
                    //     }
                    // }
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
                    if shortcut == &ctrl_shift_c {
                        match event.state() {
                            ShortcutState::Released => {
                                let app_clone = app.clone();
                                std::thread::spawn(move || {
                                    let rt = tokio::runtime::Runtime::new().unwrap();
                                    rt.block_on(translate_selected_text(&app_clone));
                                });
                            }
                            _ => {}
                        }
                    }
                    if shortcut == &ctrl_i {
                        match event.state() {
                            ShortcutState::Released => {
                                app.emit_to("overlay", "close_translate", ()).ok();
                                stop_floating_translate();
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
            register_shortcut_handler(&app.handle());
            setup::setup_database(&app.handle());

            setup::setup_overlay_window(&app.handle());
            setup::setup_main_window(&app.handle());
            setup::setup_notification_window(&app.handle());

            setup::setup_tray(&app.handle())?;

            // start_global_mouse_stream(window);
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
