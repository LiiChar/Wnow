use strsim::levenshtein;

use crate::ocr::OcrWord;

/* =========================
НАСТРОЙКИ
========================= */

const LINE_Y_THRESHOLD: i32 = 10;
const MAX_LEV_DISTANCE: usize = 2;

const VOWELS_RU: &str = "аеёиоуыэюя";

const VOWELS_EN: &str = "aeiouy";

/* Минимальный словарь.
⚠️ В реальном проекте лучше грузить из файла */
static DICTIONARY: &[&str] = &[
    "привет",
    "пока",
    "сообщение",
    "приват",
    "настройки",
    "файл",
    "отмена",
    "сохранить",
    "вход",
    "выход",
    "ошибка",
];

/* =========================
БАЗОВЫЕ ФИЛЬТРЫ
========================= */

fn looks_like_word(s: &str) -> bool {
    let s = s.trim();

    if s.len() < 2 {
        return false;
    }

    let letters = s.chars().filter(|c| c.is_alphabetic()).count();
    let digits = s.chars().filter(|c| c.is_numeric()).count();

    if digits > 0 {
        return false;
    }

    if letters * 100 / s.len() < 70 {
        return false;
    }

    true
}

fn has_vowels(s: &str) -> bool {
    s.chars().any(|c| {
        c.to_lowercase()
            .next()
            .map(|c| VOWELS_EN.contains(c))
            .unwrap_or(false)
    })
}

fn is_suspicious(word: &str) -> bool {
    let vowels = word
        .chars()
        .filter(|c| {
            c.to_lowercase()
                .next()
                .map(|c| VOWELS_RU.contains(c))
                .unwrap_or(false)
        })
        .count();

    vowels == 0 || vowels * 2 < word.len()
}

/* =========================
ИСПРАВЛЕНИЕ СЛОВ
========================= */

fn correct_word(word: &str) -> Option<String> {
    let w = word.to_lowercase();

    let mut best: Option<(&str, usize)> = None;

    for &dict in DICTIONARY {
        let dist = levenshtein(&w, dict);

        if dist <= MAX_LEV_DISTANCE {
            match best {
                Some((_, best_dist)) if dist >= best_dist => {}
                _ => best = Some((dict, dist)),
            }
        }
    }

    best.map(|(w, _)| w.to_string())
}

/* =========================
ГРУППИРОВКА В СТРОКИ
========================= */

fn group_words_into_lines(words: &[OcrWord]) -> Vec<Vec<OcrWord>> {
    let mut words = words.to_vec();

    words.sort_by(|a, b| {
        if (a.y - b.y).abs() < LINE_Y_THRESHOLD {
            a.x.cmp(&b.x)
        } else {
            a.y.cmp(&b.y)
        }
    });

    let mut lines: Vec<Vec<OcrWord>> = Vec::new();

    for w in words {
        if let Some(line) = lines.last_mut() {
            let avg_y = line.iter().map(|w| w.y).sum::<i32>() / line.len() as i32;

            if (w.y - avg_y).abs() < LINE_Y_THRESHOLD {
                line.push(w);
                continue;
            }
        }
        lines.push(vec![w]);
    }

    lines
}

/* =========================
КОНТЕКСТНОЕ ИСПРАВЛЕНИЕ
========================= */

fn correct_line_context(words: &[OcrWord]) -> Vec<OcrWord> {
    let mut out = Vec::with_capacity(words.len());

    for w in words {
        let raw = w.text.trim();

        if !looks_like_word(raw) || !has_vowels(raw) {
            continue;
        }

        // let text = if is_suspicious(raw) {
        //     correct_word(raw).unwrap_or_else(|| raw.to_string())
        // } else {
        //     raw.to_string()
        // };

        out.push(OcrWord {
            text: raw.to_string(),
            ..w.clone()
        });
    }

    out
}

/* =========================
ПУБЛИЧНЫЙ API
========================= */

pub fn postprocess_ocr(words: Vec<OcrWord>) -> Vec<OcrWord> {
    let lines = group_words_into_lines(&words);

    let mut result = Vec::new();

    for line in lines {
        let fixed = correct_line_context(&line);
        result.extend(fixed);
    }

    result
}
