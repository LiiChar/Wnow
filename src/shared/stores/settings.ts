import { createSignal } from 'solid-js';
import { createStore } from "solid-js/store";

import type { AppSettings } from '../types/storage';

import { log } from '../lib/log';
import { getSettings, saveSettings } from '../api/settings';


export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  source_lang: 'en',
  target_lang: 'ru',
  hotkey_translate_word: 'Ctrl+U',
  hotkey_translate_area: 'Ctrl+Y',
  hotkey_translate_screen: 'Ctrl+T',
  hotkey_translate_clipboard: 'Ctrl+Shift+C',
  auto_save_words: false,
  show_notifications: true,
  minimize_to_tray: true,
  start_minimized: false,
  image_replacement: false,
  // Новые настройки по умолчанию
  auto_launch: false,
  overlay_opacity: 95,
  font_size: 'medium',
  overlay_position: 'top',
  auto_copy_translation: false,
  hide_after_translation: false,
  overlay_duration: 5000,
  enable_sound: false,
  show_word_context: true,
  compact_mode: false,
};

const [settingsStore, setSettingsStore] = createStore<AppSettings>(DEFAULT_SETTINGS);
const [isLoaded, setIsLoaded] = createSignal(false);

export async function initSettings(): Promise<AppSettings> {
  try {
    const loaded = await getSettings();
    const merged = { ...DEFAULT_SETTINGS, ...loaded };
    setSettingsStore(merged);
    setIsLoaded(true);
    return merged;
  } catch (e) {
    console.warn('Settings load failed, using defaults:', e);
    setIsLoaded(true);
    return DEFAULT_SETTINGS;
  }
}

export async function updateSettings(updates: Partial<AppSettings>) {
  // Логгируем только фактически изменённые значения
  for (const key in updates) {
    const oldValue = settingsStore[key as keyof AppSettings];
    const newValue = updates[key as keyof AppSettings];
    if (oldValue !== newValue) {
      log.info(`[SETTINGS][UPDATE] ${key}: ${oldValue} → ${newValue}`);
    }
  }

  // Обновляем store поэлементно для сохранения реактивности
  setSettingsStore(updates);

  // Сохраняем все настройки на бэкенд
  try {
    await saveSettings({ ...settingsStore, ...updates });
  } catch (e) {
    console.error('Failed to save settings:', e);
  }

  if (updates.theme) {
    applyTheme(updates.theme);
  }
}

export function applyTheme(theme: AppSettings['theme']) {
  const isDark = theme === 'dark' ||
  (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.body.classList.toggle('dark', isDark);
}

export { isLoaded, settingsStore };
