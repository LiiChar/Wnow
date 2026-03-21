import { createEffect, createSignal, onCleanup, Show, For } from "solid-js";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { invoke } from "@tauri-apps/api/core";

import { SelectionArea, SelectionMode } from "../component/SelectionArea";
import { BoxCanvas } from "../component/box/BoxCanvas";
import { WordPopup, WordTranslation } from "../component/WordPopup";
import { FloatingTranslation, FloatingTranslationData } from "../component/FloatingTranslation";
import { ToastContainer, showToast } from "../component/Toast";
import { IconCopy, IconTrash, IconCheck, IconCollapse } from "../component/Icons";
import { TextBox } from "../shared/types/ocr";

// API
const quickTranslate = async (word: string): Promise<string> => {
	try {
		return await invoke<string>('quick_translate', { word });
	} catch {
		return word;
	}
};

const batchTranslate = async (words: string[]): Promise<Map<string, string>> => {
	try {
		const result = await invoke<[string, string][]>('batch_translate', { words });
		return new Map(result.map(([word, translation]) => [word.toLowerCase(), translation]));
	} catch {
		return new Map();
	}
};

const translateFullText = async (text: string): Promise<string> => {
	const sentences = text.replace(/\n+/g, ' ').split(/(?<=[.!?])\s+/).filter(s => s.trim());
	if (!sentences.length) return text;
	const translations = await Promise.all(sentences.map(s => quickTranslate(s.trim()).catch(() => s)));
	return translations.join(' ');
};

interface TranslatorOverlayProps {
	onOpenApp: () => void;
}

export function TranslatorOverlay(props: TranslatorOverlayProps) {
	const [app, setApp] = createSignal<ReturnType<typeof getCurrentWebviewWindow> | null>(null);
	const [isSelectFragment, setIsSelectFragment] = createSignal(false);
	const [boxes, setBoxes] = createSignal<TextBox[]>([]);
	const [translations, setTranslations] = createSignal<Record<string, string>>({});
	const [wordPopup, setWordPopup] = createSignal<WordTranslation | null>(null);
	const [fullText, setFullText] = createSignal("");
	const [showFullTranslation, setShowFullTranslation] = createSignal(false);
	const [fullCopied, setFullCopied] = createSignal(false);
	const [isCompactMode, setIsCompactMode] = createSignal(true);
	
	// Постоянные переводы (закрываются только по ESC)
	const [floatingTranslations, setFloatingTranslations] = createSignal<FloatingTranslationData[]>([]);

	const getTranslation = (text: string) => translations()[text.toLowerCase()];
	const addTranslation = (text: string, translation: string) => {
		setTranslations(prev => ({ ...prev, [text.toLowerCase()]: translation }));
	};

	const setCursorEvents = (enabled: boolean) => {
		app()?.setIgnoreCursorEvents(!enabled);
	};

	const translateBoxes = async (boxList: TextBox[]) => {
		const words = boxList.map(b => b.text).filter(t => !translations()[t.toLowerCase()]);
		if (!words.length) return;
		const results = await batchTranslate(words);
		results.forEach((t, w) => addTranslation(w, t));
	};

	const closeAll = () => {
		if (!isSelectFragment()) {
			setBoxes([]);
			setWordPopup(null);
			setShowFullTranslation(false);
			setFullText("");
			// Также закрываем все плавающие переводы
			setFloatingTranslations([]);
			setCursorEvents(false);
		}
	};

	const removeFloatingTranslation = (id: string) => {
		setFloatingTranslations(prev => prev.filter(t => t.id !== id));
		// Если нет больше плавающих переводов и ничего не показывается, отключаем события
		if (floatingTranslations().length === 0 && !wordPopup() && !showFullTranslation() && boxes().length === 0) {
			setCursorEvents(false);
		}
	};

	const addFloatingTranslation = (data: FloatingTranslationData) => {
		setFloatingTranslations(prev => [...prev, data]);
	};

	createEffect(() => {
		setApp(getCurrentWebviewWindow());

		const listeners = [
			listen<void>('open_app', () => props.onOpenApp()),
			listen<TextBox[]>('show_translate', ({ payload }) => {
				setWordPopup(null);
				setShowFullTranslation(false);
				setBoxes(prev => [...prev, ...payload]);
				setCursorEvents(true);
				translateBoxes(payload);
			}),
			listen<void>('translate_fragment', () => {
				setWordPopup(null);
				setCursorEvents(true);
				setIsSelectFragment(true);
			}),
			listen<WordTranslation>('translate_word', ({ payload }) => {
				setShowFullTranslation(false);
				setWordPopup(payload);
				setCursorEvents(true);
				if (payload.word && payload.translation) {
					addTranslation(payload.word, payload.translation);
				}
			}),
			listen<void>('close_popup', closeAll),
		];

		onCleanup(() => {
			listeners.forEach(p => p.then(fn => fn()));
		});
	});

	const handleWordClick = async (text: string, x: number, y: number, w: number, h: number) => {
		let translation = getTranslation(text);
		if (!translation) {
			translation = await quickTranslate(text);
			addTranslation(text, translation);
		}
		setWordPopup({
			word: text,
			translation,
			context: "",
			context_translation: "",
			popup_x: x + w / 2,
			popup_y: y,
			word_x: x,
			word_y: y,
			word_w: w,
			word_h: h,
		});
	};

	const handleAddToStudy = async (_word: string) => {
		const popup = wordPopup();
		if (popup) {
			try {
				await invoke('add_word_to_study', {
					word: popup.word,
					translation: popup.translation,
					context: popup.context,
					contextTranslation: popup.context_translation,
					screenshotBase64: null,
				});
				// Toast показывается в WordPopup
			} catch (e) {
				console.error('Failed to add word:', e);
				showToast('Ошибка сохранения', 'error');
			}
		}
	};

	return (
		<main class='fixed inset-0 bg-transparent' onClick={closeAll}>
			<ToastContainer />
			<BoxCanvas
				boxes={boxes}
				getTranslation={getTranslation}
				onWordClick={handleWordClick}
			/>

			{/* Floating Translations (persistent mode) */}
			<For each={floatingTranslations()}>
				{floatData => (
					<FloatingTranslation
						data={floatData}
						onClose={removeFloatingTranslation}
					/>
				)}
			</For>

			{/* Full Translation Panel - компактный режим */}
			<Show when={showFullTranslation() && fullText()}>
				<div
					class={`fixed z-50 ${isCompactMode() ? 'bottom-4 right-4 max-w-xs' : 'bottom-4 left-1/2 -translate-x-1/2 max-w-xl w-[90%]'}`}
					onClick={e => e.stopPropagation()}
				>
					<div class='glass-dark rounded-lg border border-neutral-700 shadow-2xl overflow-hidden'>
						{/* Compact mode */}
						<Show when={isCompactMode()}>
							<div class='p-3'>
								<div class='flex items-start justify-between gap-2 mb-2'>
									<span class='text-[10px] text-neutral-500'>
										Перевод области
									</span>
									<button
										onClick={() => setIsCompactMode(false)}
										class='p-1 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 rounded transition-colors'
										title='Развернуть'
									>
										<IconCollapse size={12} />
									</button>
								</div>
								<p class='text-xs text-neutral-100 line-clamp-4 wrap-break-word'>
									{fullText() || '...'}
								</p>
								<div class='flex gap-1 mt-2'>
									<button
										onClick={() => {
											navigator.clipboard.writeText(fullText());
											setFullCopied(true);
											showToast('Скопировано', 'success');
											setTimeout(() => setFullCopied(false), 2000);
										}}
										class={`p-1.5 rounded transition-colors ${
											fullCopied()
												? 'text-emerald-400 bg-emerald-950/30'
												: 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800'
										}`}
										title='Копировать'
									>
										<Show when={fullCopied()} fallback={<IconCopy size={12} />}>
											<IconCheck size={12} />
										</Show>
									</button>
									<button
										onClick={() => {
											setBoxes([]);
											setFullText('');
											setShowFullTranslation(false);
											setFullCopied(false);
										}}
										class='p-1.5 rounded text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 transition-colors'
										title='Очистить'
									>
										<IconTrash size={12} />
									</button>
								</div>
							</div>
						</Show>

						{/* Full mode */}
						<Show when={!isCompactMode()}>
							<div class='flex items-center justify-between px-3 py-2 border-b border-neutral-800'>
								<span class='text-xs font-medium text-neutral-200'>
									Перевод
								</span>
								<button
									onClick={() => setIsCompactMode(true)}
									class='text-neutral-500 hover:text-neutral-300 p-1 rounded hover:bg-neutral-800 transition-colors'
									title='Свернуть'
								>
									<IconCollapse size={14} />
								</button>
							</div>
							<div class='p-3 space-y-2 max-h-48 overflow-y-auto'>
								<div>
									<div class='text-[10px] text-neutral-500 mb-0.5'>Перевод</div>
									<p class='text-xs text-neutral-100 whitespace-pre-wrap wrap-break-word'>
										{fullText() || '...'}
									</p>
								</div>
							</div>
							<div class='flex border-t border-neutral-800'>
								<button
									onClick={() => {
										navigator.clipboard.writeText(fullText());
										setFullCopied(true);
										showToast('Скопировано', 'success');
										setTimeout(() => setFullCopied(false), 2000);
									}}
									class={`flex-1 py-2 flex items-center justify-center gap-1 text-xs transition-colors ${
										fullCopied()
											? 'text-emerald-400 bg-emerald-950/30'
											: 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
									}`}
								>
									<Show when={fullCopied()} fallback={<IconCopy size={12} />}>
										<IconCheck size={12} />
									</Show>
								</button>
								<button
									onClick={() => {
										setBoxes([]);
										setFullText('');
										setShowFullTranslation(false);
										setFullCopied(false);
									}}
									class='flex-1 py-2 flex items-center justify-center gap-1 text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors border-l border-neutral-800'
								>
									<IconTrash size={12} />
								</button>
							</div>
						</Show>
					</div>
				</div>
			</Show>

			<WordPopup
				data={wordPopup()}
				onClose={() => setWordPopup(null)}
				onAddToStudy={handleAddToStudy}
			/>

			{isSelectFragment() && (
				<SelectionArea
					onConfirm={async (rect, mode: SelectionMode) => {
						setIsSelectFragment(false);
						try {
							const [text, resultBoxes] = await invoke<[string, TextBox[]]>(
								'get_block_translate',
								{ pos: [rect.x, rect.y], size: [rect.w, rect.h] },
							);
							if (!text && !resultBoxes.length) return;

							if (mode === 'persistent') {
								// Создаём плавающий перевод
								const translation = await translateFullText(text);
								addFloatingTranslation({
									id: `float-${Date.now()}`,
									text: text,
									translation: translation,
									x: rect.x,
									y: rect.y,
									w: rect.w,
									h: rect.h,
								});
								setCursorEvents(true);
							} else {
								// Обычный перевод
								setFullText(prev => (prev ? `${prev}\n\n${text}` : text));
								const adjusted = resultBoxes.map(b => ({
									...b,
									x: b.x + rect.x,
									y: b.y + rect.y,
								}));
								setBoxes(prev => [...prev, ...adjusted]);
								setCursorEvents(true);
								setShowFullTranslation(true);
							}
						} catch (e) {
							console.error('Translation error:', e);
						}
					}}
					onCancel={() => setIsSelectFragment(false)}
				/>
			)}
		</main>
	);
}

