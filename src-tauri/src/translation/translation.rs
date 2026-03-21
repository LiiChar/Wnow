use std::time::{Duration, Instant};
use dashmap::DashMap;
use once_cell::sync::Lazy;
use thiserror::Error;
use tauri_plugin_log::log::{log, Level};

use super::local;

const CACHE_TTL: Duration = Duration::from_secs(60 * 60 * 24);
const REQUEST_TIMEOUT: Duration = Duration::from_secs(2); 
const MAX_BATCH_SIZE: usize = 10; 

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TranslationMode {
    LocalFirst,
    OnlineOnly,
    OfflineOnly,
}

/// Текущий режим перевода
static TRANSLATION_MODE: Lazy<std::sync::Mutex<TranslationMode>> = 
    Lazy::new(|| std::sync::Mutex::new(TranslationMode::LocalFirst));


static HTTP_CLIENT: Lazy<reqwest::Client> = Lazy::new(|| {
    reqwest::Client::builder()
        .timeout(REQUEST_TIMEOUT)
        .pool_max_idle_per_host(5)
        .tcp_keepalive(Duration::from_secs(30))
        .build()
        .expect("Failed to create HTTP client")
});

#[derive(Clone)]
struct CacheEntry {
    value: String,
    expires_at: Instant,
}

static CACHE: Lazy<DashMap<String, CacheEntry>> = Lazy::new(DashMap::new);

#[derive(Debug, Error)]
pub enum TranslateError {
    #[error("translation failed: {0}")]
    Translate(String),

    #[error("network error: {0}")]
    Network(String),

    #[error("no translation found")]
    NotFound,
}

pub fn set_translation_mode(mode: TranslationMode) {
    if let Ok(mut current) = TRANSLATION_MODE.lock() {
        *current = mode;
    }
}

pub fn get_translation_mode() -> TranslationMode {
    TRANSLATION_MODE.lock().map(|m| *m).unwrap_or(TranslationMode::LocalFirst)
}

pub async fn translate(
    text: String,
    from: &str,
    to: &str,
) -> Result<String, TranslateError> {
    let text_lower = text.to_lowercase();
    let text_trimmed = text_lower.trim();

    if text_trimmed.is_empty() {
        return Ok(String::new());
    }

    let cache_key = format!("{}:{}:{}", from, to, text_trimmed);

    let mode = get_translation_mode();

    let is_single_word = !text_trimmed.contains(' ');

    if mode != TranslationMode::OnlineOnly && is_single_word {
        if let Some(translation) = local::translate_word_local(text_trimmed, from, to) {
            cache_result(&cache_key, translation.clone());
            return Ok(translation);
        }
    }

    if (mode == TranslationMode::LocalFirst || mode == TranslationMode::OfflineOnly) && !is_single_word {
        if let Ok(translated) = local::translate_local_translator(&text, from, to) {
            if !translated.is_empty() {
                cache_result(&cache_key, translated.clone());
                
                return Ok(translated);
            }
        }
    }

    if mode == TranslationMode::OfflineOnly {
        let local_result = local::translate_local_simple(&text, from, to);
        cache_result(&cache_key, local_result.clone());
        return Ok(local_result);
    }

    match translate_google(&text, from, to).await {
        Ok(translation) if !translation.is_empty() => {
            cache_result(&cache_key, translation.clone());
            return Ok(translation);
        }
        Err(e) => {
            if mode == TranslationMode::LocalFirst {
                let local_result = local::translate_local_simple(&text, from, to);
                if local_result != text {
                    cache_result(&cache_key, local_result.clone());
                    return Ok(local_result);
                }
            }
            eprintln!("Online translation failed: {:?}", e);
        }
        _ => {}
    }

    Ok(format!("[{}]", text))
}

pub async fn translate_batch(sentences: Vec<String>, from: &str, to: &str) -> Result<Vec<String>, TranslateError> {
    let mut results = Vec::with_capacity(sentences.len());

    // Сначала проверяем кэш и словари
    for s in &sentences {
        let translation = translate(s.clone(), from, to).await?;
        results.push(translation);
    }

    Ok(results)
}

pub async fn translate_words_batch(
    words: Vec<String>,
    from: &str,
    to: &str,
) -> Vec<(String, String)> {
    let mut results = Vec::with_capacity(words.len());
    let mut to_translate = Vec::new();
    let mode = get_translation_mode();

    // Сначала проверяем кэш и словари
    for word in &words {
        let word_lower = word.to_lowercase();
        let cache_key = format!("{}:{}:{}", from, to, word_lower);

        // 1. Проверяем кэш
        if let Some(entry) = CACHE.get(&cache_key) {
            if entry.expires_at > Instant::now() {
                results.push((word.clone(), entry.value.clone()));
                continue;
            }
        }

        // 2. Проверяем локальный словарь для известных слов
        if mode != TranslationMode::OnlineOnly {
            if let Some(translation) = local::translate_word_local(&word_lower, from, to) {
                cache_result(&cache_key, translation.clone());
                results.push((word.clone(), translation));
                continue;
            }
        }

        // Добавляем в очередь для онлайн-перевода
        to_translate.push(word.clone());
    }

    // Переводим оставшиеся слова (если разрешён онлайн)
    if !to_translate.is_empty() && mode != TranslationMode::OfflineOnly {
        for chunk in to_translate.chunks(MAX_BATCH_SIZE) {
            // Объединяем слова через ||| для batch перевода
            let combined = chunk.join(" ||| ");

            if let Ok(translated) = translate_google(&combined, from, to).await {
                let parts: Vec<&str> = translated.split(" ||| ").collect();

                for (i, word) in chunk.iter().enumerate() {
                    let translation = parts
                        .get(i)
                        .map(|s| s.trim().to_string())
                        .unwrap_or_else(|| format!("[{}]", word));

                    let cache_key = format!("{}:{}:{}", from, to, word.to_lowercase());
                    cache_result(&cache_key, translation.clone());
                    results.push((word.clone(), translation));
                }
            } else {
                // Fallback: возвращаем оригиналы в скобках
                for word in chunk {
                    results.push((word.clone(), format!("[{}]", word)));
                }
            }
        }
    } else if !to_translate.is_empty() {
        // В офлайн режиме возвращаем оригиналы для непереведённых слов
        for word in to_translate {
            results.push((word.clone(), format!("[{}]", word)));
        }
    }

    results
}

/// Сохранение в кэш
fn cache_result(key: &str, value: String) {
    CACHE.insert(
        key.to_string(),
        CacheEntry {
            value,
            expires_at: Instant::now() + CACHE_TTL,
        },
    );
}

/// Google Translate API (бесплатный endpoint)
async fn translate_google(text: &str, from: &str, to: &str) -> Result<String, TranslateError> {
    // Конвертируем коды языков
    let from_code = match from {
        "eng" | "en" => "en",
        "rus" | "ru" => "ru",
        "jpn" | "ja" => "ja",
        "deu" | "de" => "de",
        "fra" | "fr" => "fr",
        "spa" | "es" => "es",
        "ita" | "it" => "it",
        "por" | "pt" => "pt",
        "zho" | "zh" => "zh",
        "kor" | "ko" => "ko",
        _ => from,
    };

    let to_code = match to {
        "eng" | "en" => "en",
        "rus" | "ru" => "ru",
        "jpn" | "ja" => "ja",
        "deu" | "de" => "de",
        "fra" | "fr" => "fr",
        "spa" | "es" => "es",
        "ita" | "it" => "it",
        "por" | "pt" => "pt",
        "zho" | "zh" => "zh",
        "kor" | "ko" => "ko",
        _ => to,
    };

    let url = format!(
        "https://translate.googleapis.com/translate_a/single?client=gtx&sl={}&tl={}&dt=t&q={}",
        from_code,
        to_code,
        urlencoding::encode(text)
    );

    let response = HTTP_CLIENT
        .get(&url)
        .header(
            "User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        )
        .send()
        .await
        .map_err(|e| TranslateError::Network(e.to_string()))?;

    if !response.status().is_success() {
        return Err(TranslateError::Network(format!(
            "HTTP {}",
            response.status()
        )));
    }

    let text = response
        .text()
        .await
        .map_err(|e| TranslateError::Translate(e.to_string()))?;

    parse_google_response(&text).ok_or(TranslateError::NotFound)
}

/// Парсинг ответа Google Translate
fn parse_google_response(response: &str) -> Option<String> {
    let mut result = String::new();
    let mut in_string = false;
    let mut escape = false;
    let mut current = String::new();
    let mut strings: Vec<String> = Vec::new();

    for ch in response.chars() {
        if escape {
            current.push(ch);
            escape = false;
            continue;
        }

        match ch {
            '\\' if in_string => escape = true,
            '"' => {
                if in_string {
                    strings.push(current.clone());
                    current.clear();
                }
                in_string = !in_string;
            }
            _ if in_string => current.push(ch),
            _ => {}
        }
    }

    // Берём переводы (чётные элементы)
    let mut i = 0;
    while i < strings.len() {
        if i % 2 == 0 && !strings[i].is_empty() {
            if !result.is_empty() {
                result.push(' ');
            }
            result.push_str(&strings[i]);
        }
        i += 1;
        if i >= 2 && !result.is_empty() {
            break;
        }
    }

    if result.is_empty() {
        None
    } else {
        Some(result)
    }
}
