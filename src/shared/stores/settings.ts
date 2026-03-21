import { createSignal } from 'solid-js';
import type { Store } from '@tauri-apps/plugin-store';
import type { AppSettings } from '../types/storage';

const DEFAULT_SETTINGS: AppSettings = {
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
  start_mode: 'app',
  is_pro: false,
  pro_expires: null,
};

const [settings, setSettingsSignal] = createSignal<AppSettings>(DEFAULT_SETTINGS);
const [isLoaded, setIsLoaded] = createSignal(false);

let storeInstance: Store | null = null;

export async function initSettings(): Promise<AppSettings> {
  try {
    // Динамический импорт с таймаутом
    const timeoutPromise = new Promise<AppSettings>((_, reject) => {
      setTimeout(() => reject(new Error('Store load timeout')), 3000);
    });

    const loadPromise = (async () => {
      const { load } = await import('@tauri-apps/plugin-store');
      storeInstance = await load('settings.json');
      
      const saved = await storeInstance.get<AppSettings>('settings');
      if (saved) {
        const merged = { ...DEFAULT_SETTINGS, ...saved };
        setSettingsSignal(merged);
        setIsLoaded(true);
        return merged;
      }
      
      setIsLoaded(true);
      return DEFAULT_SETTINGS;
    })();

    return await Promise.race([loadPromise, timeoutPromise]);
  } catch (e) {
    console.warn('Settings load failed, using defaults:', e);
    setIsLoaded(true);
    return DEFAULT_SETTINGS;
  }
}

export async function updateSettings(updates: Partial<AppSettings>) {
  const newSettings = { ...settings(), ...updates };
  setSettingsSignal(newSettings);
  
  try {
    if (storeInstance) {
      await storeInstance.set('settings', newSettings);
      await storeInstance.save();
    }
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
  
  document.documentElement.classList.toggle('dark', isDark);
}

export { settings, isLoaded };
