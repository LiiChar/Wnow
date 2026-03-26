import { ModelElement } from "@/components/model/ModelElement";
import { ToastStatus } from "@/components/toaster/ToastStatus";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { downloadModel, getAvailableModels, getModelList } from "@/shared/api/model";
import { languages } from "@/shared/lib/language";
import { toaster } from "@kobalte/core/toast";
import { createSignal, For, onMount } from "solid-js";
import { listen } from '@tauri-apps/api/event';
import { log } from "@/shared/lib/log";

const getLangFromModelId = (modelId: string) => {
  const lang = modelId.replace("gaudi/opus-mt-", "").replace("-ctranslate2", "");
  return lang.toLowerCase();
};

const formatedModelName = (modelId: string) => {
  const langs = getLangFromModelId(modelId).split("-") as [string, string];
  let sourceLang = languages.find(l => l.code === langs[0]);
  let targetLang = languages.find(l => l.code === langs[1]);

  return `${sourceLang?.name ?? langs[0]} → ${targetLang?.name ?? langs[1]}`;
};

type DownloadingModel = {
	model: string;
	progress: number;
};

export const Models = () => {
  const [models, setModels] = createSignal<string[]>([]);
  const [availableModels, setAvailableModels] = createSignal<string[]>([]);
  const [downloadingModels, setDownloadingModels] = createSignal<{id: string, progress: number}[]>([]);

  onMount(async () => {
    try {
      const models = await getModelList();
      setModels(models);
    } catch (e) {
      console.error('Failed to get models:', e);
    }

    try {
      let storageModels = localStorage.getItem('available_models');
      let aModels 
      if (!storageModels || storageModels.length === 0) {
				aModels = await getAvailableModels();
				localStorage.setItem('available_models', JSON.stringify(aModels));
			} else {
        aModels = JSON.parse(localStorage.getItem('available_models') ?? '');
      }
      
      setAvailableModels(aModels);
    } catch (e) {
      console.error('Failed to get available models:', e);
    }

    listen<DownloadingModel>(`download-progress`, ({ payload }) => {
      setDownloadingModels(prev => {
				const exists = prev.find(m => m.id === payload.model);
				if (exists) {
					return prev.map(m =>
						m.id === payload.model ? { ...m, progress: payload.progress } : m,
					);
				} else {
					return [...prev, { id: payload.model, progress: payload.progress }];
				}
			});
    });
  });
  return (
		<Card>
			<CardHeader>
				<CardTitle class='text-base'>Модели для перевода</CardTitle>
				<CardDescription class='text-xs'>
					Модели для перевода текста доступные для скачивания
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div class='flex flex-col gap-2 max-h-62 overflow-auto '>
					<For
						each={availableModels().filter(
							m => models().includes(getLangFromModelId(m)),
						)}
					>
						{model => {
							return (
                <ModelElement
                  isDownloaded={true}
									title={formatedModelName(model)}
								/>
							);
						}}
					</For>
					<For
						each={availableModels().filter(
							m => !models().includes(getLangFromModelId(m)),
						)}
					>
						{model => {
							return (
								<ModelElement
                  isDownloaded={false}
                  isDownloading={downloadingModels().find(m => m.id === model) !== undefined}
                  downloadProgress={+(downloadingModels().find(m => m.id === model)?.progress ?? 0).toFixed(2)}
									title={formatedModelName(model)}
									onClick={async () => {
										await downloadModel(model);
										toaster.show(props => (
											<ToastStatus
												status='success'
												text='Модель успешно скачена'
												toastId={props.toastId}
											/>
										));
									}}
								/>
							);
						}}
					</For>
				</div>
			</CardContent>
		</Card>
	);
}

