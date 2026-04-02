// Типы для хранилища

export interface SavedWord {
  id: number;
  word: string;
  translation: string;
  context: string;
  context_translation: string;
  screenshot_path: string | null;
  source_lang: string;
  target_lang: string;
  created_at: number;
  last_reviewed: number | null;
  review_count: number;
  correct_count: number;
  mastery_level: number;
  next_review: number | null;
}

export interface FlashcardWord {
  id: number;
  word: string;
  translation: string;
  context: string;
  screenshot_path: string | null;
  mastery_level: number;
}

export interface LearningStats {
  total_words: number;
  words_learned: number;
  words_in_progress: number;
  total_reviews: number;
  correct_reviews: number;
  streak_days: number;
  last_study_date: number | null;
}

export interface AppSettings {
  image_replacement: boolean;
  theme: 'light' | 'dark' | 'system';
  source_lang: string;
  target_lang: string;
  hotkey_translate_word: string;
  hotkey_translate_area: string;
  hotkey_translate_screen: string;
  hotkey_translate_clipboard: string;
  auto_save_words: boolean;
  show_notifications: boolean;
  minimize_to_tray: boolean;
  start_minimized: boolean;
  floating_delay: number;
  // Новые настройки
  auto_launch: boolean;
  overlay_opacity: number;
  font_size: 'small' | 'medium' | 'large';
  overlay_position: 'top' | 'bottom' | 'center';
  auto_copy_translation: boolean;
  hide_after_translation: boolean;
  overlay_duration: number;
  enable_sound: boolean;
  show_word_context: boolean;
  compact_mode: boolean;
  ui_locale: 'ru' | 'en' | 'es' | 'de' | 'fr' | 'it' | 'pt' | 'zh' | 'ja' | 'ko';
}

export const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
];

