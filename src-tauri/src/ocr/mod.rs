mod ocr;
mod postprocess;
mod preproccesor;

pub use ocr::{recognize_with_boxes, OcrWord};
pub use postprocess::{postprocess_ocr, split_ocr_to_words};
pub use preproccesor::{preprocess_for_rapid_ocr, preprocess_for_tesseract_sys};
