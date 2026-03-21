use crate::translation;

/// Установить режим перевода
#[tauri::command]
pub fn set_translation_mode(mode: String) -> Result<(), String> {
    let translation_mode = match mode.as_str() {
        "local_first" | "LocalFirst" => translation::TranslationMode::LocalFirst,
        "online_only" | "OnlineOnly" => translation::TranslationMode::OnlineOnly,
        "offline_only" | "OfflineOnly" => translation::TranslationMode::OfflineOnly,
        _ => return Err(format!("Unknown mode: {}", mode)),
    };
    translation::set_translation_mode(translation_mode);
    Ok(())
}

/// Получить текущий режим перевода
#[tauri::command]
pub fn get_current_translation_mode() -> String {
    match translation::get_translation_mode() {
        translation::TranslationMode::LocalFirst => "local_first".to_string(),
        translation::TranslationMode::OnlineOnly => "online_only".to_string(),
        translation::TranslationMode::OfflineOnly => "offline_only".to_string(),
    }
}

/// Получить список доступных моделей для локального перевода
#[tauri::command]
pub fn get_translation_models() -> Vec<String> {
    vec![]
}

/// Проверить, скачана ли модель
#[tauri::command]
pub fn is_model_available(_model_id: String) -> bool {
    true
}
