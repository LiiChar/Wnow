pub mod local;
mod translation;

pub use translation::{
    get_translation_mode, set_translation_mode, translate, translate_batch, translate_words_batch,
    TranslationMode,
};
