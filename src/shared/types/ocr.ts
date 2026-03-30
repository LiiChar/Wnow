export type TextBox = {
	id?: string;
	text: string;
	translation?: string;
	context?: string;
	context_translation?: string;
	h: number;
	w: number;
	x: number;
	y: number;
};

/**
 * Параметры для перевода изображения с заменой текста
 */
export interface ImageTranslationParams {
	/** X координата области захвата */
	x: number;
	/** Y координата области захвата */
	y: number;
	/** Ширина области */
	width: number;
	/** Высота области */
	height: number;
	/** Исходный язык (например, "en") */
	source_lang: string;
	/** Целевой язык (например, "ru") */
	target_lang: string;
	/** Включить замену текста на изображении */
	use_text_replacement: boolean;
}

/**
 * Статистика обработки изображения
 */
export interface TranslationStats {
	/** Количество обработанных боксов */
	boxes_processed: number;
	/** Количество успешных замен */
	boxes_successful: number;
	/** Средний размер шрифта */
	avg_font_size: number;
	/** Время обработки в мс */
	processing_time_ms: number;
}

/**
 * Результат перевода изображения
 */
export interface ImageTranslationResult {
	/** Распознанный оригинальный текст */
	original_text: string;
	/** Переведённый текст (общий) */
	translated_text: string;
	/** Детали по каждому боксу */
	boxes: TextBox[];
	/** Обработанное изображение в base64 */
	processed_image_base64: string | null;
	/** Статистика обработки */
	stats: TranslationStats | null;
}

/**
 * Параметры для настройки замены текста
 */
export interface TextReplacementParams {
	/** Паддинг вокруг бокса для маски (в пикселях) */
	mask_padding: number;
	/** Внутренний отступ текста (в пикселях) */
	text_padding: number;
	/** Прозрачность подложки (0.0 - 1.0) */
	overlay_alpha: number;
	/** Минимальный размер шрифта */
	min_font_size: number;
	/** Максимальный размер шрифта */
	max_font_size: number;
	/** Шаг подбора размера шрифта */
	font_size_step: number;
}
