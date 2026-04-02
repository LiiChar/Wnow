import { createContext, createSignal, useContext, createEffect, type ParentComponent, type Accessor } from 'solid-js';

import type { Locale, LocaleCode } from '../locales';
import { SUPPORTED_LOCALES } from '../locales';
import { en, es, de, fr, it, ja, ko, pt, ru, zh } from '../locales';
import { settingsStore } from '../stores/settings';

const locales: Record<LocaleCode, Locale> = {
	ru,
	en,
	es,
	de,
	fr,
	it,
	pt,
	zh,
	ja,
	ko,
};

interface LocaleContextType {
	locale: Accessor<LocaleCode>;
	setLocale: (locale: LocaleCode) => void;
	t: Accessor<Locale>;
}

const LocaleContext = createContext<LocaleContextType>();

export const LocaleProvider: ParentComponent<{ initialLocale?: LocaleCode }> = (props) => {
	const [locale, setLocale] = createSignal<LocaleCode>(props.initialLocale || settingsStore.ui_locale || 'ru');
	const t = () => locales[locale()] || ru;

	// Синхронизируем локаль с настройками приложения
	createEffect(() => {
		const uiLocale = settingsStore.ui_locale;
		if (uiLocale && uiLocale !== locale()) {
			setLocale(uiLocale);
		}
	});

	return (
		<LocaleContext.Provider value={{ locale, setLocale, t }}>
			{props.children}
		</LocaleContext.Provider>
	);
};

export const useLocale = () => {
	const context = useContext(LocaleContext);
	if (!context) {
		throw new Error('useLocale must be used within a LocaleProvider');
	}
	return context;
};

export const getLocale = (code: LocaleCode): Locale => {
	return locales[code] || ru;
};

export const setLocalePreference = (code: LocaleCode) => {
	try {
		localStorage.setItem('wnow_locale', code);
	} catch (e) {
		console.warn('Failed to save locale preference:', e);
	}
};

export const getPreferredLocale = (): LocaleCode => {
	try {
		const stored = localStorage.getItem('wnow_locale');
		if (stored && ['ru', 'en', 'es', 'de', 'fr', 'it', 'pt', 'zh', 'ja', 'ko'].includes(stored)) {
			return stored as LocaleCode;
		}

		const browserLang = navigator.language.toLowerCase();
		if (browserLang.startsWith('ru')) return 'ru';
		if (browserLang.startsWith('en')) return 'en';
		if (browserLang.startsWith('es')) return 'es';
		if (browserLang.startsWith('de')) return 'de';
		if (browserLang.startsWith('fr')) return 'fr';
		if (browserLang.startsWith('it')) return 'it';
		if (browserLang.startsWith('pt')) return 'pt';
		if (browserLang.startsWith('zh')) return 'zh';
		if (browserLang.startsWith('ja')) return 'ja';
		if (browserLang.startsWith('ko')) return 'ko';

		return 'ru';
	} catch (e) {
		console.warn('Failed to get preferred locale:', e);
		return 'ru';
	}
};

export { SUPPORTED_LOCALES };
