use strsim::levenshtein;

use crate::ocr::OcrWord;

const LINE_Y_THRESHOLD: i32 = 10;
const MAX_WORD_GAP: i32 = 20;
const MAX_LEV_DISTANCE: usize = 2;

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

fn looks_like_word(s: &str) -> bool {
    let s = s.trim();
    if s.len() < 2 {
        return false;
    }

    let letters = s.chars().filter(|c| c.is_alphabetic()).count();
    letters * 100 / s.len() > 60
}

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

fn group_lines(words: &[OcrWord]) -> Vec<Vec<OcrWord>> {
    let mut words = words.to_vec();

    words.sort_by_key(|w| (w.y, w.x));

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

    // сортируем внутри строки
    for line in &mut lines {
        line.sort_by_key(|w| w.x);
    }

    lines
}

fn can_merge(a: &OcrWord, b: &OcrWord) -> bool {
    let a_right = a.x + a.w;
    let gap = b.x - a_right;

    gap >= 0 && gap <= MAX_WORD_GAP
}

fn try_merge_sequence(words: &[OcrWord]) -> Option<OcrWord> {
    let text = words.iter().map(|w| w.text.as_str()).collect::<String>();

    if let Some(corrected) = correct_word(&text) {
        let first = words.first()?;
        let last = words.last()?;

        return Some(OcrWord {
            id: None,
            text: corrected,
            x: first.x,
            y: first.y,
            w: (last.x + last.w) - first.x,
            h: first.h,
            translation: None,
        });
    }

    None
}

fn merge_words(line: &[OcrWord]) -> Vec<OcrWord> {
    let mut result = Vec::new();
    let mut i = 0;

    while i < line.len() {
        let mut merged = None;

        // пробуем 3 слова
        if i + 2 < line.len()
            && can_merge(&line[i], &line[i + 1])
            && can_merge(&line[i + 1], &line[i + 2])
        {
            merged = try_merge_sequence(&line[i..=i + 2]);
            if merged.is_some() {
                result.push(merged.unwrap());
                i += 3;
                continue;
            }
        }

        // пробуем 2 слова
        if i + 1 < line.len() && can_merge(&line[i], &line[i + 1]) {
            merged = try_merge_sequence(&line[i..=i + 1]);
            if merged.is_some() {
                result.push(merged.unwrap());
                i += 2;
                continue;
            }
        }

        result.push(line[i].clone());
        i += 1;
    }

    result
}

fn process_line(words: &[OcrWord]) -> Vec<OcrWord> {
    let merged = merge_words(words);

    merged
        .into_iter()
        .map(|mut w| {
            let raw = w.text.trim().to_string();

            if looks_like_word(&raw) {
                if let Some(corrected) = correct_word(&raw) {
                    w.text = corrected;
                } else {
                    w.text = raw;
                }
            }

            w
        })
        .collect()
}

fn build_sentences(lines: Vec<Vec<OcrWord>>) -> Vec<OcrWord> {
    let mut result = Vec::new();

    for line in lines {
        if line.is_empty() {
            continue;
        }

        let mut text = String::new();

        for (i, w) in line.iter().enumerate() {
            if i > 0 {
                text.push(' ');
            }
            text.push_str(&w.text);
        }

        let first = &line[0];
        let last = &line[line.len() - 1];

        result.push(OcrWord {
            id: None,
            text,
            x: first.x,
            y: first.y,
            w: (last.x + last.w) - first.x,
            h: first.h,
            translation: None,
        });
    }

    result
}

pub fn postprocess_ocr(words: Vec<OcrWord>) -> Vec<OcrWord> {
    let lines = group_lines(&words);

    let mut processed_lines = Vec::new();

    for line in lines {
        let fixed = process_line(&line);
        processed_lines.push(fixed);
    }

    build_sentences(processed_lines)
}
