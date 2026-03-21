use image::RgbImage;
use ocr_rs::{OcrEngine, OcrEngineConfig};
use serde::Serialize;
use std::sync::OnceLock;

use crate::get_resource_dir;

#[derive(Debug, Serialize, Clone)]
pub struct OcrWord {
    pub x: i32,
    pub y: i32,
    pub w: i32,
    pub h: i32,
    pub text: String,
    pub translation: Option<String>,
}

static OCR_ENGINE: OnceLock<OcrEngine> = OnceLock::new();

fn get_ocr_engine() -> Result<&'static OcrEngine, String> {
    if let Some(engine) = OCR_ENGINE.get() {
        return Ok(engine);
    }

    let root_path = get_resource_dir();

    let models_path = root_path.join("ocr-model");

    let det_model = models_path.join("PP-OCRv5_mobile_det_fp16.mnn");
    let rec_model = models_path.join("cyrillic_PP-OCRv5_mobile_rec_infer.mnn");
    let charset = models_path.join("ppocr_keys_cyrillic.txt");

    let config = OcrEngineConfig::fast()
        .with_parallel(true); // 🔥 ключ к скорости

    let engine = OcrEngine::new(
        det_model.to_str().unwrap(),
        rec_model.to_str().unwrap(),
        charset.to_str().unwrap(),
        Some(config),
    )
    .map_err(|e| format!("Engine error: {}", e))?;

    Ok(OCR_ENGINE.get_or_init(|| engine))
}

pub fn recognize_with_boxes(
    gray: &[u8],
    width: i32,
    height: i32,
    scale: f32,
) -> (String, Vec<OcrWord>) {

    // grayscale → RGB (быстро)
    let mut rgb = Vec::with_capacity(gray.len() * 3);
    for &p in gray {
        rgb.extend_from_slice(&[p, p, p]);
    }

    let img = RgbImage::from_raw(width as u32, height as u32, rgb)
        .expect("image error");

    let engine = match get_ocr_engine() {
        Ok(e) => e,
        Err(e) => {
            eprintln!("{}", e);
            return (String::new(), vec![]);
        }
    };

    let results = match engine.recognize(&image::DynamicImage::ImageRgb8(img)) {
        Ok(r) => r,
        Err(e) => {
            eprintln!("OCR error: {}", e);
            return (String::new(), vec![]);
        }
    };

    let mut words = Vec::with_capacity(results.len());
    let mut full_text = String::new();

    for r in results {
        if r.text.is_empty() {
            continue;
        }

        let rect = &r.bbox.rect;

        words.push(OcrWord {
            x: (rect.left() as f32 / scale) as i32,
            y: (rect.top() as f32 / scale) as i32,
            w: (rect.width() as f32 / scale) as i32,
            h: (rect.height() as f32 / scale) as i32,
            text: r.text.clone(),
            translation: None,
        });

        full_text.push_str(&r.text);
        full_text.push(' ');
    }

    (full_text, words)
}