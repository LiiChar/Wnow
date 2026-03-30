use std::collections::HashMap;

use std::sync::{Arc, Mutex};

use ct2rs::tokenizers::auto::Tokenizer as AutoTokenizer;
use ct2rs::Translator;
use ct2rs::{ComputeType, Config as Ct2rsConfig, Device, TranslationOptions};
use once_cell::sync::Lazy;
use tauri_plugin_log::log::{log, Level};

use crate::get_resource_dir;

pub mod simple {
    use std::collections::HashMap;

    /// Простой локальный переводчик на основе словаря
    pub struct SimpleTranslator {
        dict_en_ru: HashMap<String, String>,
        dict_ru_en: HashMap<String, String>,
    }

    impl SimpleTranslator {
        pub fn new() -> Self {
            let mut dict_en_ru = HashMap::new();
            let mut dict_ru_en = HashMap::new();

            // Загружаем базовый словарь (можно расширить)
            Self::load_basic_dict(&mut dict_en_ru, &mut dict_ru_en);

            SimpleTranslator {
                dict_en_ru,
                dict_ru_en,
            }
        }

        fn load_basic_dict(
            en_ru: &mut HashMap<String, String>,
            ru_en: &mut HashMap<String, String>,
        ) {
            // Основная база для одиночных слов берётся из `resources/dictionary/*.json`.
            // Для ключей делаем lowercase, чтобы поиск был case-insensitive.
            let raw_en_ru: HashMap<String, String> =
                serde_json::from_str(include_str!("../../resources/dictionary/en_ru.json"))
                    .unwrap_or_default();
            for (k, v) in raw_en_ru {
                en_ru.entry(k.to_lowercase()).or_insert(v);
            }

            let raw_ru_en: HashMap<String, String> =
                serde_json::from_str(include_str!("../../resources/dictionary/ru_en.json"))
                    .unwrap_or_default();
            for (k, v) in raw_ru_en {
                ru_en.entry(k.to_lowercase()).or_insert(v);
            }
        }

        /// Переводит слово
        pub fn translate_word(&self, word: &str, from: &str, to: &str) -> Option<String> {
            let word_lower = word.to_lowercase();

            if from == "en" && to == "ru" {
                self.dict_en_ru.get(&word_lower).cloned()
            } else if from == "ru" && to == "en" {
                self.dict_ru_en.get(&word_lower).cloned()
            } else {
                None
            }
        }

        /// Переводит текст пословно
        pub fn translate_text(&self, text: &str, from: &str, to: &str) -> String {
            let words: Vec<&str> = text.split_whitespace().collect();
            let translated: Vec<String> = words
                .iter()
                .map(|w| {
                    // Сохраняем пунктуацию
                    let (word, punct) = Self::split_punctuation(w);
                    let translated = self
                        .translate_word(&word, from, to)
                        .unwrap_or_else(|| word.to_string());
                    format!("{}{}", translated, punct)
                })
                .collect();

            translated.join(" ")
        }

        fn split_punctuation(word: &str) -> (String, String) {
            let punct_chars: &[char] = &[
                '.', ',', '!', '?', ';', ':', '"', '\'', '(', ')', '[', ']', '{', '}',
            ];
            let mut main = word.to_string();
            let mut punct = String::new();

            while main.ends_with(punct_chars) {
                if let Some(c) = main.pop() {
                    punct.insert(0, c);
                }
            }

            (main, punct)
        }
    }

    impl Default for SimpleTranslator {
        fn default() -> Self {
            Self::new()
        }
    }
}

/// Глобальный экземпляр простого переводчика
static SIMPLE_TRANSLATOR: Lazy<simple::SimpleTranslator> = Lazy::new(simple::SimpleTranslator::new);

type AutoCt2rsTranslator = Translator<AutoTokenizer>;

static TRANSLATORS: Lazy<Mutex<HashMap<String, Arc<AutoCt2rsTranslator>>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

fn ct2rs_model_id(from: &str, to: &str) -> Option<&'static str> {
    match (from, to) {
        ("en", "ru") => Some("en-ru"),
        ("ru", "en") => Some("ru-en"),
        _ => None,
    }
}

pub fn translate_local_translator(text: &str, from: &str, to: &str) -> Result<String, String> {
    let model_id = ct2rs_model_id(from, to)
        .ok_or_else(|| format!("Unsupported language pair: {} -> {}", from, to))?;

    let root_dir = get_resource_dir().join("translate-model");
    let model_path = root_dir.join(model_id);

    if !model_path.exists() {
        return Err(format!("Model {} not downloaded", model_id));
    }

    let translator = {
        let mut map = TRANSLATORS.lock().map_err(|e| e.to_string())?;

        if !map.contains_key(model_id) {
            let config = Ct2rsConfig {
                device: Device::CPU,
                compute_type: ComputeType::INT8,
                num_threads_per_replica: 4,
                max_queued_batches: 8,
                ..Default::default()
            };

            let translator =
                AutoCt2rsTranslator::new(&model_path, &config).map_err(|e| e.to_string())?;

            log!(Level::Info, "Loaded translator for {}", model_id);

            map.insert(model_id.to_string(), Arc::new(translator));
        }

        map.get(model_id).unwrap().clone()
    };

    let options = TranslationOptions {
        beam_size: 1,
        max_decoding_length: 128,
        ..Default::default()
    };

    let sources = vec![text];

    let results = translator
        .translate_batch(&sources, &options, None)
        .map_err(|e| e.to_string())?;

    Ok(results.first().map(|(s, _)| s.clone()).unwrap_or_default())
}

pub fn translate_local(text: &str, from: &str, to: &str) -> String {
    SIMPLE_TRANSLATOR.translate_text(text, from, to)
}
