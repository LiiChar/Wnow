use tauri::AppHandle;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};

/// Регистрирует горячие клавиши
pub fn register_shortcut_handler(app: &AppHandle) {
    let ctrl_t = Shortcut::new(Some(Modifiers::CONTROL), Code::KeyT);
    let ctrl_y = Shortcut::new(Some(Modifiers::CONTROL), Code::KeyY);
    let ctrl_u = Shortcut::new(Some(Modifiers::CONTROL), Code::KeyU);
    let ctrl_shift_c = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyC);
    let ctrl_i = Shortcut::new(Some(Modifiers::CONTROL), Code::KeyI);

    // Регистрируем горячие клавиши (игнорируем ошибки если уже зарегистрированы)
    app.global_shortcut().register(ctrl_t).ok();
    app.global_shortcut().register(ctrl_y).ok();
    app.global_shortcut().register(ctrl_u).ok();
    app.global_shortcut().register(ctrl_shift_c).ok();
    app.global_shortcut().register(ctrl_i).ok();
}
