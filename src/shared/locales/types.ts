export interface Locale {
	common: {
		appName: string;
		loading: string;
		save: string;
		cancel: string;
		delete: string;
		edit: string;
		close: string;
		confirm: string;
		search: string;
		placeholder: string;
	};
	header: {
		dictionary: string;
		dictionaryDescription: string;
		study: string;
		studyDescription: string;
		settings: string;
		settingsDescription: string;
	};
	dictionary: {
		title: string;
		emptyTitle: string;
		emptyDescription: string;
		searchPlaceholder: string;
		wordCount: (count: number) => string;
		masteryLearned: string;
		masteryGood: string;
		masteryLearning: string;
		masteryNew: string;
		wordCountHeader: (count: number) => string;
		deleteConfirmTitle: string;
		deleteConfirmButton: string;
		reviews: string;
		accuracy: string;
		level: string;
	};
	study: {
		title: string;
		noWordsTitle: string;
		noWordsDescription: string;
		refresh: string;
		sessionComplete: string;
		correct: string;
		wrong: string;
		restart: string;
		howToTranslate: string;
		translation: string;
		clickToAnswer: string;
		dontKnow: string;
		know: string;
		noWordsToRepeat: string;
		wordsDescription: (total: number, learned: number) => string;
	};
	settings: {
		title: string;
		description: string;
		launch: {
			title: string;
			description: string;
			startMinimized: string;
			startMinimizedDesc: string;
			autoLaunch: string;
			autoLaunchDesc: string;
		};
		appearance: {
			title: string;
			description: string;
			theme: string;
			themeDark: string;
			themeLight: string;
			themeSystem: string;
			fontSize: string;
			fontSizeSmall: string;
			fontSizeMedium: string;
			fontSizeLarge: string;
			compactMode: string;
			compactModeDesc: string;
		};
		languages: {
			title: string;
			description: string;
			sourceLanguage: string;
			targetLanguage: string;
		};
		models: {
			title: string;
			description: string;
		};
		translationEngine: {
			title: string;
			description: string;
			replaceText: string;
			replaceTextDesc: string;
			mode: string;
			modeOnlineFirst: string;
			modeOfflineOnly: string;
			modeOnlineOnly: string;
			recommendation: string;
			recommendationText: string;
			localMode: string;
			localModeDesc: string;
			offlineMode: string;
			offlineModeDesc: string;
			onlineMode: string;
			onlineModeDesc: string;
		};
		hotkeys: {
			title: string;
			description: string;
			translateWord: string;
			translateArea: string;
			translateScreen: string;
			translateClipboard: string;
			restartRequired: string;
		};
		behavior: {
			title: string;
			description: string;
			autoSaveWords: string;
			autoSaveWordsDesc: string;
			notifications: string;
			notificationsDesc: string;
			minimizeToTray: string;
			minimizeToTrayDesc: string;
			showContext: string;
			showContextDesc: string;
		};
		overlay: {
			title: string;
			description: string;
			backgroundOpacity: string;
			position: string;
			positionTop: string;
			positionBottom: string;
			positionCenter: string;
			duration: string;
			autoCopy: string;
			autoCopyDesc: string;
			hideAfterShow: string;
			hideAfterShowDesc: string;
			soundEffects: string;
			soundEffectsDesc: string;
		};
		reset: {
			button: string;
			confirmTitle: string;
			confirmDesc: string;
			success: string;
			successDesc: string;
			error: string;
			errorDesc: string;
		};
	};
	toast: {
		saved: string;
		deleted: string;
		error: string;
		success: string;
	};
	dialog: {
		cancel: string;
		confirm: string;
		close: string;
	};
}

export type LocaleCode = 'ru' | 'en' | 'es' | 'de' | 'fr' | 'it' | 'pt' | 'zh' | 'ja' | 'ko';

export const SUPPORTED_LOCALES: { code: LocaleCode; name: string; flag: string }[] = [
	{ code: 'ru', name: 'Русский', flag: '🇷🇺' },
	{ code: 'en', name: 'English', flag: '🇬🇧' },
	{ code: 'es', name: 'Español', flag: '🇪🇸' },
	{ code: 'de', name: 'Deutsch', flag: '🇩🇪' },
	{ code: 'fr', name: 'Français', flag: '🇫🇷' },
	{ code: 'it', name: 'Italiano', flag: '🇮🇹' },
	{ code: 'pt', name: 'Português', flag: '🇵🇹' },
	{ code: 'zh', name: '中文', flag: '🇨🇳' },
	{ code: 'ja', name: '日本語', flag: '🇯🇵' },
	{ code: 'ko', name: '한국어', flag: '🇰🇷' },
];
