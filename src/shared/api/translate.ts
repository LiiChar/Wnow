import { invoke } from "@tauri-apps/api/core";
import { TextBox, ImageTranslationParams, ImageTranslationResult } from "../types/ocr";


type PosTranslateBlock = [number, number];
type SizeTranslateBlock = [number, number];


export const getBlockTranslate = async (
	position: PosTranslateBlock,
	size: SizeTranslateBlock,
) => {
	const translation = await invoke<[string, TextBox[]]>('get_block_translate', {
		pos: position,
		size,
	});
	return translation;
};

export const translate = async (text: string, sourceLang: string, targetLang: string) => {
	const translation = await invoke<string>('translate', { text, sourceLang, targetLang });
	return translation;
};

export const startFloatingTranslate = async (position: PosTranslateBlock, size: SizeTranslateBlock) => {
	await invoke('start_floating_translate', {
		pos: position,
		size,
	});
};

export const stopFloatingTranslate = async () => {
	await invoke('stop_floating_translate');
};

/**
 * Перевод изображения с заменой текста
 * @param params Параметры перевода
 * @returns Результат с обработанным изображением
 */
export const translateImageWithReplacement = async (
	params: ImageTranslationParams
): Promise<ImageTranslationResult> => {
	const result = await invoke<ImageTranslationResult>('translate_image_with_replacement', {
		params,
	});
	return result;
};

/**
 * Упрощённый перевод фрагмента (без обработки изображения)
 */
export const translateFragment = async (
	pos: [number, number],
	size: [number, number],
	sourceLang: string,
	targetLang: string
): Promise<[string, string, TextBox[]]> => {
	const result = await invoke<[string, string, TextBox[]]>('translate_fragment', {
		pos,
		size,
		sourceLang,
		targetLang,
	});
	return result;
};