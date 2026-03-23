import {
	createSignal,
	createMemo,
	Show,
	For,
	onMount,
	onCleanup,
} from 'solid-js';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { invoke } from '@tauri-apps/api/core';

import { SelectionArea, SelectionMode } from '../../components/overlay/SelectionArea';
import { BoxCanvas } from '../../components/box/BoxCanvas';
import {
	FloatingTranslation,
	FloatingTranslationData,
} from '../../components/FloatingTranslation';
import { TextBox } from '../../shared/types/ocr';
import { Check, Copy, FoldVertical, Trash } from 'lucide-solid';
import { toaster } from '@kobalte/core/toast';
import { ToastStatus } from '@/components/toaster/ToastStatus';

interface TranslatorOverlayProps {
	onOpenApp: () => void;
}

export function TranslatorOverlay(props: TranslatorOverlayProps) {
	const [isSelectFragment, setIsSelectFragment] = createSignal(false);
	const [boxes, setBoxes] = createSignal<TextBox[]>([]);
	const [translations, setTranslations] = createSignal<Record<string, string>>(
		{},
	);
	const [fullText, setFullText] = createSignal('');
	const [showFullTranslation, setShowFullTranslation] = createSignal(false);
	const [fullCopied, setFullCopied] = createSignal(false);
	const [isCompactMode, setIsCompactMode] = createSignal(true);

	const [floatingTranslations, setFloatingTranslations] = createSignal<
		FloatingTranslationData[]
	>([]);

	const setCursorEvents = (enabled: boolean) => {
		getCurrentWebviewWindow().setIgnoreCursorEvents(!enabled);
	};

	const addTranslation = (text: string, translation: string) => {
		setTranslations(prev => ({ ...prev, [text.toLowerCase()]: translation }));
	};

		onMount(() => {
		const unsubs: (() => void)[] = [];

		const add = async <T,>(
			event: string,
			handler: (e: { payload: T }) => void,
		) => {
			const un = await listen<T>(event, handler);
			unsubs.push(un);
		};

		add<void>('open_app', () => props.onOpenApp());

		add<TextBox[]>('show_translate', ({ payload }) => {
			setShowFullTranslation(false);
			setBoxes(prev => [...prev, ...payload]);
			setCursorEvents(true);
			translateBoxes(payload);
		});

		add<void>('translate_fragment', () => {
			setCursorEvents(true);
			console.log('translate_fragment');
			setIsSelectFragment(true);
		});

		add<void>('close_popup', closeAll);

		onCleanup(() => {
			unsubs.forEach(fn => fn());
		});
	});

	const translateBoxes = async (boxList: TextBox[]) => {
		try {
			const words = boxList.map(b => b.text).filter(Boolean);
			if (!words.length) return;

			const result = await invoke<Record<string, string>>('translate_words', {
				words,
			});

			Object.entries(result).forEach(([w, t]) => addTranslation(w, t));
		} catch (e) {
			console.error('translateBoxes error:', e);
		}
	};

	const translateFullText = async (text: string) => {
		try {
			const result = await invoke<string>('translate_text', { text });
			return result;
		} catch (e) {
			console.error('translateFullText error:', e);
			return text;
		}
	};

	const closeAll = () => {
		if (!isSelectFragment()) {
			setBoxes([]);
			setShowFullTranslation(false);
			setFullText('');
			setFloatingTranslations([]);
			setCursorEvents(false);
		}
	};

	const removeFloatingTranslation = (id: string) => {
		setFloatingTranslations(prev => {
			const next = prev.filter(t => t.id !== id);

			if (next.length === 0 && !showFullTranslation() && boxes().length === 0) {
				setCursorEvents(false);
			}

			return next;
		});
	};

	const addFloatingTranslation = (data: FloatingTranslationData) => {
		setFloatingTranslations(prev => [...prev, data]);
	};

	const copyFullText = () => {
		navigator.clipboard.writeText(fullText());
		setFullCopied(true);

		toaster.show(p => (
			<ToastStatus status='success' text='Скопировано' toastId={p.toastId} />
		));

		setTimeout(() => setFullCopied(false), 2000);
	};



	return (
		<main class='fixed inset-0 bg-transparent' onClick={closeAll}>
			<BoxCanvas boxes={boxes} />

			<For each={floatingTranslations()}>
				{floatData => (
					<FloatingTranslation
						data={floatData}
						onClose={removeFloatingTranslation}
					/>
				)}
			</For>

			<Show when={showFullTranslation() && fullText()}>
				<div
					class={`fixed z-50 ${
						isCompactMode()
							? 'bottom-4 right-4 max-w-xs'
							: 'bottom-4 left-1/2 -translate-x-1/2 max-w-xl w-[90%]'
					}`}
					onClick={e => e.stopPropagation()}
				>
					<div class='glass-dark rounded-lg border border-neutral-700 shadow-2xl overflow-hidden'>
						<Show when={isCompactMode()}>
							<div class='p-3'>
								<div class='flex justify-between mb-2'>
									<span class='text-[10px] text-neutral-500'>Перевод</span>
									<button onClick={() => setIsCompactMode(false)}>
										<FoldVertical size={12} />
									</button>
								</div>

								<p class='text-xs text-neutral-100 line-clamp-4'>
									{fullText()}
								</p>

								<div class='flex gap-1 mt-2'>
									<button onClick={copyFullText}>
										<Show when={fullCopied()} fallback={<Copy size={12} />}>
											<Check size={12} />
										</Show>
									</button>

									<button
										onClick={() => {
											setBoxes([]);
											setFullText('');
											setShowFullTranslation(false);
										}}
									>
										<Trash size={12} />
									</button>
								</div>
							</div>
						</Show>

						<Show when={!isCompactMode()}>
							<div class='p-3'>
								<p class='text-sm text-neutral-100 whitespace-pre-wrap'>
									{fullText()}
								</p>
							</div>

							<div class='flex border-t border-neutral-800'>
								<button onClick={copyFullText} class='flex-1 py-2'>
									<Show when={fullCopied()} fallback={<Copy size={12} />}>
										<Check size={12} />
									</Show>
								</button>

								<button
									onClick={() => {
										setBoxes([]);
										setFullText('');
										setShowFullTranslation(false);
									}}
									class='flex-1 py-2 border-l border-neutral-800'
								>
									<Trash size={12} />
								</button>
							</div>
						</Show>
					</div>
				</div>
			</Show>

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
								const translation = await translateFullText(text);

								addFloatingTranslation({
									id: `float-${Date.now()}`,
									text,
									translation,
									x: rect.x,
									y: rect.y,
									w: rect.w,
									h: rect.h,
								});

								setCursorEvents(true);
							} else {
								setFullText(prev => (prev ? `${prev}\n\n${text}` : text));

								const adjusted = resultBoxes.map(b => ({
									...b,
									x: b.x + rect.x,
									y: b.y + rect.y,
								}));

								setBoxes(prev => [...prev, ...adjusted]);
								setShowFullTranslation(true);
								setCursorEvents(true);
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
