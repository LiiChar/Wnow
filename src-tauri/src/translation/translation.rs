use std::time::{Duration, Instant};
use dashmap::DashMap;
use once_cell::sync::Lazy;
use reqwest::StatusCode;
use thiserror::Error;
use tauri_plugin_log::log::{log, Level};
use tokio::time::sleep;

use super::local;

const CACHE_TTL: Duration = Duration::from_secs(60 * 60 * 24);
const REQUEST_TIMEOUT: Duration = Duration::from_secs(2); 
const MAX_BATCH_SIZE: usize = 10; 
const MAX_RETRIES: usize = 2;

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

    match online_translate(text.clone(), from, to).await {
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
/// 🔥 НОРМАЛИЗАЦИЯ ЯЗЫКОВ
fn normalize_lang(lang: &str) -> &str {
    match lang {
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
        _ => lang,
    }
}

pub async fn online_translate(text: String, from: &str, to: &str) -> Result<String, TranslateError> {
    let from = normalize_lang(from);
    let to = normalize_lang(to);

    // 🔥 retry loop
    for attempt in 0..=MAX_RETRIES {
        

        if let Ok(res) = translate_mymemory(&text, from, to).await {
            if !res.is_empty() {
                return Ok(res);
            }
        }

        if let Ok(res) = translate_deepl(&text, from, to).await {
            if !res.is_empty() {
                return Ok(res);
            }
        }

        if let Ok(res) = translate_libre(&text, from, to).await {
            if !res.is_empty() {
                return Ok(res);
            }
        }

        if let Ok(res) = translate_google(&text, from, to).await {
            if !res.is_empty() {
                return Ok(res);
            }
        }

        if attempt < MAX_RETRIES {
            sleep(Duration::from_millis(200)).await;
        }
    }

    Err(TranslateError::NotFound)
}

async fn translate_mymemory(text: &str, from: &str, to: &str) -> Result<String, TranslateError> {
    let url = "https://mymemory.translated.net/api/get";

    let params = [
        ("q", text),
        ("langpair", &format!("{}|{}", from, to)),
    ];

    let res = HTTP_CLIENT
        .get(url)
        .query(&params)
        .send()
        .await
        .map_err(|e| TranslateError::Network(e.to_string()))?;

    if !res.status().is_success() {
        return Err(TranslateError::Network(format!(
            "MyMemory HTTP {}",
            res.status()
        )));
    }

    let json: serde_json::Value = res
        .json()
        .await
        .map_err(|e| TranslateError::Translate(e.to_string()))?;

    Ok(json["responseData"]["translatedText"]
        .as_str()
        .unwrap_or("")
        .to_string())
}

async fn translate_deepl(text: &str, from: &str, to: &str) -> Result<String, TranslateError> {
    let url = "https://api-free.deepl.com/v2/translate";

    let params = [
        ("text", text),
        ("source_lang", &from.to_uppercase()),
        ("target_lang", &to.to_uppercase()),
    ];

    let res = HTTP_CLIENT
        .post(url)
        .header("Authorization", format!("DeepL-Auth-Key {}", ""))
        .form(&params)
        .send()
        .await
        .map_err(|e| TranslateError::Network(e.to_string()))?;

    if res.status() != StatusCode::OK {
        return Err(TranslateError::Network(format!(
            "DeepL HTTP {}",
            res.status()
        )));
    }

    let json: serde_json::Value = res
        .json()
        .await
        .map_err(|e| TranslateError::Translate(e.to_string()))?;

    Ok(json["translations"][0]["text"]
        .as_str()
        .unwrap_or("")
        .to_string())
}

async fn translate_libre(text: &str, from: &str, to: &str) -> Result<String, TranslateError> {
    let res = HTTP_CLIENT
        .post("https://libretranslate.de/translate")
        .json(&serde_json::json!({
            "q": text,
            "source": from,
            "target": to,
            "format": "text"
        }))
        .send()
        .await
        .map_err(|e| TranslateError::Network(e.to_string()))?;

    if !res.status().is_success() {
        return Err(TranslateError::Network(format!(
            "Libre HTTP {}",
            res.status()
        )));
    }

    let json: serde_json::Value = res
        .json()
        .await
        .map_err(|e| TranslateError::Translate(e.to_string()))?;

    Ok(json["translatedText"]
        .as_str()
        .unwrap_or("")
        .to_string())
}

async fn translate_google(text: &str, from: &str, to: &str) -> Result<String, TranslateError> {
    let url = format!(
        "https://translate.googleapis.com/translate_a/single?client=gtx&sl={}&tl={}&dt=t&q={}",
        from,
        to,
        urlencoding::encode(text)
    );

    let res = HTTP_CLIENT
        .get(&url)
        .header("User-Agent", "Mozilla/5.0")
        .send()
        .await
        .map_err(|e| TranslateError::Network(e.to_string()))?;

    if !res.status().is_success() {
        return Err(TranslateError::Network(format!(
            "Google HTTP {}",
            res.status()
        )));
    }

    let json: serde_json::Value = res
        .json()
        .await
        .map_err(|e| TranslateError::Translate(e.to_string()))?;

    // 🔥 нормальный парс без костылей
    Ok(json[0][0][0].as_str().unwrap_or("").to_string())
}