mod capture;
mod preproccesor;

pub use capture::Capture;
pub use preproccesor::{preprocess_for_tesseract, preprocess_for_tesseract_sys};
