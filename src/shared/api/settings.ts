import { invoke } from "@tauri-apps/api/core";

import type { AppSettings } from "../types/storage";

export const getTranslationMode = async () => invoke<string>('get_current_translation_mode')

export const setTranslationMode = async (mode: string) => invoke('set_translation_mode', { mode })

export const getSettings = async () => invoke<AppSettings>('get_settings')

export const saveSettings = async (settings: AppSettings) => invoke('save_settings', { settings })
