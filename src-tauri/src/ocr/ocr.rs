use image::RgbImage;
use ocr_rs::{OcrEngine, OcrEngineConfig};
use serde::Serialize;
use std::sync::OnceLock;
use tauri_plugin_log::log::{self, log, Level};

use crate::{get_resource_dir, utils::fnv1a_hash};

#[derive(Debug, Serialize, Clone)]
pub struct OcrWord {
    pub id: Option<String>,
    pub x: i32,
    pub y: i32,
    pub w: i32,
    pub h: i32,
    pub text: String,
    pub translation: Option<String>,
    pub image: Option<String>,
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

    let config = OcrEngineConfig::fast().with_parallel(true);

    let engine = OcrEngine::new(
        det_model.to_str().unwrap(),
        rec_model.to_str().unwrap(),
        charset.to_str().unwrap(),
        Some(config),
    )
    .map_err(|e| format!("Engine error: {}", e))?;

    log!(Level::Info, "OCR engine initialized");

    Ok(OCR_ENGINE.get_or_init(|| engine))
}

pub fn recognize_with_boxes(
    gray: &[u8],
    width: i32,
    height: i32,
    scale: f32,
) -> (String, Vec<OcrWord>) {
    let mut rgb: Vec<u8> = Vec::with_capacity(gray.len() * 3);
    for &p in gray {
        rgb.extend_from_slice(&[p, p, p]);
    }

    let img = RgbImage::from_raw(width as u32, height as u32, rgb).expect("image error");

    let engine = match get_ocr_engine() {
        Ok(e) => e,
        Err(e) => {
            eprintln!("{}", e);
            return (String::new(), vec![]);
        }
    };

    let results = match engine.recognize(&image::DynamicImage::ImageRgb8(img.clone())) {
        Ok(r) => r,
        Err(e) => {
            eprintln!("OCR error: {}", e);
            return (String::new(), vec![]);
        }
    };

    let mut words = Vec::with_capacity(results.len());
    let mut text = String::new();

    for r in results {
        if r.text.is_empty() {
            continue;
        }

        let rect = &r.bbox.rect;

        words.push(OcrWord {
            id: None,
            x: (rect.left() as f32 / scale) as i32,
            y: (rect.top() as f32 / scale) as i32,
            w: (rect.width() as f32 / scale) as i32,
            h: (rect.height() as f32 / scale) as i32,
            text: r.text.clone(),
            translation: None,
            image: None,
        });

        text.push_str(r.text.as_str());
        text.push(' ');
    }

    (text, words)
}

// static _OCR_ENGINE: OnceLock<OcrEngineNew> = OnceLock::new();

// pub const DETECTION_MODEL_NAME: &str = "text-detection.rten";
// pub const RECOGNITION_MODEL_NAME: &str = "text-recognition.rten";

// fn _get_ocr_engine() -> Result<&'static OcrEngineNew, String> {
//     if let Some(engine) = _OCR_ENGINE.get() {
//         return Ok(engine);
//     }

//     let root_path = get_resource_dir();
//     let models_path = root_path.join("ocr-model").join("ocr-new");
//     let detection_model = Model::load_file(models_path.join(DETECTION_MODEL_NAME))
//             .expect("Could not load detection model");
//     let recognition_model = Model::load_file(models_path.join(RECOGNITION_MODEL_NAME))
//         .expect("Could not load recognition model");

//     let engine_parames = OcrEngineParams {
//         detection_model: Some(detection_model),
//         recognition_model: Some(recognition_model),
//         ..Default::default()
//     };

//     let engine = OcrEngineNew::new(engine_parames).expect("Coult not init ocr engine");

//     return Ok(_OCR_ENGINE.get_or_init(|| engine));
// }

// pub fn _recognize_with_boxes(
//     gray: &[u8],
//     width: i32,
//     height: i32,
//     x: i32,
//     y: i32,
//     scale: f32,
// ) -> (String, Vec<OcrWord>) {
//     let engine = _get_ocr_engine().unwrap();
//     let img_source =
//         ImageSource::from_bytes(gray, (width as u32, height as u32)).unwrap();

//     let ocr_input = engine
//         .prepare_input(img_source)
//         .expect("Could not prepare input for OCR");

//     let world_rects = engine.detect_words(&ocr_input).unwrap();
//     let line_rects = engine.find_text_lines(&ocr_input, &world_rects);
//     let line_texts = engine
//         .recognize_text(&ocr_input, &line_rects)
//         .expect("Could not recognize text");

//     let mut text_buffer = String::from("");

//     for line in line_texts
//         .iter()
//         .flatten()
//         .filter(|l| l.to_string().len() > 1)
//     {
//         text_buffer.push_str(format!("{}\n", line).as_str());
//     }

//     let uniq_id = fnv1a_hash(text_buffer.clone().as_bytes());

//     let boxes = vec![OcrWord {
//         id: Some(uniq_id.to_string()),
//         h: (height as f32 / scale) as i32,
//         w: (width as f32 / scale) as i32,
//         x: (0 as f32 / scale) as i32,
//         y: (0 as f32 / scale) as i32,
//         text: text_buffer.clone(),
//         translation: None,
//     }];

//     (text_buffer, boxes)
// }
