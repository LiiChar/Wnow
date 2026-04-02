import { invoke } from "@tauri-apps/api/core";
import { FlashcardWord, LearningStats, SavedWord } from "../types/storage";

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
		screenshotPath: screenshotPath,
	});
};

export const getAllWords = async () => {
  return await invoke<SavedWord[]>('get_all_words');
}

export const deleteWord = async (id: number) => {
  return await invoke('delete_word', { wordId: id });
}

export const getWordsForStudy = async (limit: number) => {
  return await invoke<FlashcardWord[]>('get_words_for_study', { limit });
}

export const getLearningStats = async () => {
  return await invoke<LearningStats>('get_learning_stats');
}

export const updateWordProgress = async (wordId: number, quality: number) => {
  return await invoke('update_word_progress', { wordId, quality });
}