import { invoke } from "@tauri-apps/api/core";

export const getTranslationMode = async () => {
  return await invoke<string>('get_current_translation_mode');
}

export const setTranslationMode = async (mode: string) => {
  return await invoke('set_translation_mode', { mode });
}