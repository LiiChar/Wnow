import { ModelElement } from "@/components/model/ModelElement";
import { ToastStatus } from "@/components/toaster/ToastStatus";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { downloadModel, getAvailableModels, getModelList } from "@/shared/api/model";
import { languages } from "@/shared/lib/language";
import { toaster } from "@kobalte/core/toast";
import { createMemo, createSignal, For, onMount } from "solid-js";
import { listen } from '@tauri-apps/api/event';
import { log } from "@/shared/lib/log";
import { Input } from "@/components/ui/Input";
import { showNotification } from "@/shared/api/notification";

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

	const [query, setQuery] = createSignal('');
	const filteredModles = createMemo(() => {
		return availableModels()
			.filter(name => {
				return formatedModelName(name)
					.replace('→ ', '')
					.toLowerCase()
					.includes(query().toLowerCase());
			})
			.sort((a, b) => {
				const aIncluded = models().includes(getLangFromModelId(a));
				const bIncluded = models().includes(getLangFromModelId(b));

				// сначала те, что входят в models()
				if (aIncluded && !bIncluded) return -1;
				if (!aIncluded && bIncluded) return 1;

				// если оба одинаковые — можно дополнительно отсортировать по имени
				return formatedModelName(a).localeCompare(formatedModelName(b));
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
				<Input
					value={query()}
					onInput={e => setQuery(e.currentTarget.value)}
					placeholder='Поиск...'
					class="mb-2 bg-transparent!"
				/>
				<div class='flex flex-col gap-2 max-h-62 overflow-auto '>
		
					<For each={filteredModles()}>
						{model => {
							return (
								<ModelElement
									isDownloaded={models().includes(getLangFromModelId(model))}
									isDownloading={
										downloadingModels().find(m => m.id === model) !== undefined
									}
									downloadProgress={
										+(
											downloadingModels().find(m => m.id === model)?.progress ??
											0
										).toFixed(2)
									}
									title={formatedModelName(model)}
									onClick={async () => {
										if (models().includes(model)) return;

										await downloadModel(model);
										showNotification({
											status: 'success',
											title: 'Модель успешно скачена',
											duration: 2000,
											text: ""
										});
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

