use crate::storage::AppSettings;
use crate::utils::parse_hotkey;
use tauri::AppHandle;
use tauri_plugin_global_shortcut::GlobalShortcutExt;

/// Регистрирует горячие клавиши из настроек
pub fn register_shortcuts_from_settings(app: &AppHandle, settings: &AppSettings) {
    // Сначала отрегистрируем все предыдущие шорткаты
    unregister_all_shortcuts(app);

    // Парсим и регистрируем шорткаты из настроек
    if let Some(shortcut) = parse_hotkey(&settings.hotkey_translate_screen) {
        app.global_shortcut().register(shortcut).ok();
    }

    if let Some(shortcut) = parse_hotkey(&settings.hotkey_translate_area) {
        app.global_shortcut().register(shortcut).ok();
    }

    if let Some(shortcut) = parse_hotkey(&settings.hotkey_translate_word) {
        app.global_shortcut().register(shortcut).ok();
    }

    if let Some(shortcut) = parse_hotkey(&settings.hotkey_translate_clipboard) {
        app.global_shortcut().register(shortcut).ok();
    }
}

/// Отменяет регистрацию всех горячих клавиш
pub fn unregister_all_shortcuts(app: &AppHandle) {
    use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut};
    
    // Отменяем регистрацию всех возможных шорткатов
    let shortcuts = [
        Shortcut::new(Some(Modifiers::CONTROL), Code::KeyT),
        Shortcut::new(Some(Modifiers::CONTROL), Code::KeyY),
        Shortcut::new(Some(Modifiers::CONTROL), Code::KeyU),
        Shortcut::new(Some(Modifiers::CONTROL), Code::KeyI),
        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyC),
        Shortcut::new(Some(Modifiers::CONTROL), Code::KeyA),
        Shortcut::new(Some(Modifiers::CONTROL), Code::KeyB),
        Shortcut::new(Some(Modifiers::CONTROL), Code::KeyC),
        Shortcut::new(Some(Modifiers::CONTROL), Code::KeyD),
        Shortcut::new(Some(Modifiers::CONTROL), Code::KeyE),
        Shortcut::new(Some(Modifiers::CONTROL), Code::KeyF),
        Shortcut::new(Some(Modifiers::CONTROL), Code::KeyG),
        Shortcut::new(Some(Modifiers::CONTROL), Code::KeyH),
        Shortcut::new(Some(Modifiers::CONTROL), Code::KeyJ),
        Shortcut::new(Some(Modifiers::CONTROL), Code::KeyK),
        Shortcut::new(Some(Modifiers::CONTROL), Code::KeyL),
        Shortcut::new(Some(Modifiers::CONTROL), Code::KeyM),
        Shortcut::new(Some(Modifiers::CONTROL), Code::KeyN),
        Shortcut::new(Some(Modifiers::CONTROL), Code::KeyO),
        Shortcut::new(Some(Modifiers::CONTROL), Code::KeyP),
        Shortcut::new(Some(Modifiers::CONTROL), Code::KeyQ),
        Shortcut::new(Some(Modifiers::CONTROL), Code::KeyR),
        Shortcut::new(Some(Modifiers::CONTROL), Code::KeyS),
        Shortcut::new(Some(Modifiers::CONTROL), Code::KeyV),
        Shortcut::new(Some(Modifiers::CONTROL), Code::KeyW),
        Shortcut::new(Some(Modifiers::CONTROL), Code::KeyX),
        Shortcut::new(Some(Modifiers::CONTROL), Code::KeyZ),
        Shortcut::new(Some(Modifiers::CONTROL), Code::Digit0),
        Shortcut::new(Some(Modifiers::CONTROL), Code::Digit1),
        Shortcut::new(Some(Modifiers::CONTROL), Code::Digit2),
        Shortcut::new(Some(Modifiers::CONTROL), Code::Digit3),
        Shortcut::new(Some(Modifiers::CONTROL), Code::Digit4),
        Shortcut::new(Some(Modifiers::CONTROL), Code::Digit5),
        Shortcut::new(Some(Modifiers::CONTROL), Code::Digit6),
        Shortcut::new(Some(Modifiers::CONTROL), Code::Digit7),
        Shortcut::new(Some(Modifiers::CONTROL), Code::Digit8),
        Shortcut::new(Some(Modifiers::CONTROL), Code::Digit9),
        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyA),
        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyB),
        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyD),
        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyE),
        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyF),
        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyG),
        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyH),
        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyI),
        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyJ),
        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyK),
        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyL),
        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyM),
        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyN),
        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyO),
        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyP),
        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyQ),
        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyR),
        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyS),
        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyT),
        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyU),
        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyV),
        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyW),
        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyX),
        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyY),
        Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyZ),
    ];

    for shortcut in shortcuts {
        app.global_shortcut().unregister(shortcut).ok();
    }
}
