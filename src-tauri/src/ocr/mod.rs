mod ocr;
mod postprocess;

pub use ocr::{OcrWord, recognize_with_boxes};
pub use postprocess::postprocess_ocr;
