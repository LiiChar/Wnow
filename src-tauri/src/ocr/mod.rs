mod ocr;
mod postprocess;
mod preproccesor;

pub use ocr::{OcrWord, recognize_with_boxes};
pub use postprocess::{postprocess_ocr};
pub use preproccesor::{preprocess_for_tesseract_sys, preprocess_for_rapid_ocr};
