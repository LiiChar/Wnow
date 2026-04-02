import { invoke } from "@tauri-apps/api/core";

import type { FlashcardWord, LearningStats, SavedWord } from "../types/storage";

export const addWordToStudy = async (
	text: string,
	translation: string,
	screenshotPath: string | null,
	context?: string,
	contextTranslation?: string,
) => {
	// Валидация: слово не должно быть пустым
	const trimmedText = text.trim();
	if (!trimmedText) {
		throw new Error('Слово не может быть пустым');
	}
	
	await invoke('add_word_to_study', {
		word: trimmedText,
		translation: translation.trim(),
		context: context?.trim() ?? '',
		contextTranslation: contextTranslation?.trim() ?? '',
		screenshotPath,
	});
};

export const getAllWords = async () => invoke<SavedWord[]>('get_all_words')

export const deleteWord = async (id: number) => invoke('delete_word', { wordId: id })

export const clearAllWords = async () => invoke<number>('clear_all_words')

export const getWordsForStudy = async (limit: number) => invoke<FlashcardWord[]>('get_words_for_study', { limit })

export const getLearningStats = async () => invoke<LearningStats>('get_learning_stats')

export const updateWordProgress = async (wordId: number, quality: number) => invoke('update_word_progress', { wordId, quality })