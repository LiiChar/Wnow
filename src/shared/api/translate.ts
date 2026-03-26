import { invoke } from "@tauri-apps/api/core";
import { TextBox } from "../types/ocr";


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