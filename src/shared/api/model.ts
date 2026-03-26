import { invoke } from "@tauri-apps/api/core";

export const getModelList = async () => {
  return await invoke<string[]>('get_model_list');
}

export const getAvailableModels = async () => {
  return await invoke<string[]>('get_available_models');
}

export const downloadModel = async (modelId: string) => {
  return await invoke('download_model', { modelId });
}