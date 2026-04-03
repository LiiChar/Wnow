mod background;
mod font;
mod img;
mod layout;
mod render;
mod style;
mod text_replacement;

pub use img::{save_gray_image, save_grayimage_image, save_image};
pub use text_replacement::{
    debug_params, ocr_word_to_translated_box, replace_text_in_image, ReplacementStats,
    TextReplacementParams, TextReplacementResult, TranslatedBox,
};

// Публичный экспорт дополнительных модулей (для продвинутого использования)
pub use font::{get_default_font, get_font, select_font_for_text, FontType};
pub use style::{
    analyze_text_style, apply_style_to_translation, determine_text_and_bg_colors, TextAlignment,
    TextCase, TextStyle,
};
pub use layout::{
    calculate_optimal_font_size, measure_multiline_text, measure_text_height, measure_text_width,
    wrap_text, LayoutParams, TextDimensions, WrappedText,
};
pub use render::{draw_background_rect, render_text, TextRenderParams, TextRenderResult};
pub use background::{
    apply_box_blur, compute_border_color, erase_text_from_image, reconstruct_background,
    reconstruct_background_edge_aware,
};
