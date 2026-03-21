mod translation;
pub mod local;

pub use translation::{
    translate, translate_batch,
    TranslationMode, set_translation_mode, get_translation_mode, translate_words_batch
};