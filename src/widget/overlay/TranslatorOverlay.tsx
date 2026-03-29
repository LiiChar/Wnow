import {
	createSignal,
	Show,
	onMount,
	onCleanup,
} from 'solid-js';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';

import { SelectionArea, SelectionMode } from '../../components/overlay/SelectionArea';
import { BoxCanvas } from '../../components/box/BoxCanvas';
import { FloatingTranslation, type FloatingTranslationType } from '../../components/overlay/FloatingTranslation';
import { TextBox } from '../../shared/types/ocr';
import { Check, Copy, FoldVertical, Trash } from 'lucide-solid';
import { toaster } from '@kobalte/core/toast';
import { ToastStatus } from '@/components/toaster/ToastStatus';
import { log } from '@/shared/lib/log';
import { getBlockTranslate } from '@/shared/api/translate';


export function TranslatorOverlay() {
	const [isSelectFragment, setIsSelectFragment] = createSignal(false);
	const [boxes, setBoxes] = createSignal<TextBox[]>([]);
	const [fullText, setFullText] = createSignal('');
	const [showFullTranslation, setShowFullTranslation] = createSignal(false);
	const [fullCopied, setFullCopied] = createSignal(false);
	const [isCompactMode, setIsCompactMode] = createSignal(true);

	const [floatingTranslation, setFloatingTranslation] =
		createSignal<FloatingTranslationType | null>(null);

	const setCursorEvents = (enabled: boolean) => {
		getCurrentWebviewWindow().setIgnoreCursorEvents(!enabled);
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


		add<TextBox[]>('show_translate', ({ payload }) => {
			log.info('[LAYOUT][EVENT][show_translate]Listened to show_translate event with payload: ' + JSON.stringify(payload));
			setBoxes(payload);
			setShowFullTranslation(false);
			setCursorEvents(true);
		});

		add<void>('translate_fragment', () => {
			log.info('[LAYOUT][EVENT][translate_fragment]Listened to translate_fragment event');
			setCursorEvents(true);
			setIsSelectFragment(true);
		});

		add<void>('close_translate', () => setFloatingTranslation(null));

		onCleanup(() => {
			unsubs.forEach(fn => fn());
		});
	});

	const closeAll = () => {
		if (!isSelectFragment() && floatingTranslation() === null) {
			setBoxes([]);
			setShowFullTranslation(false);
			setFullText('');
			setFloatingTranslation(null);
			setCursorEvents(false);
		}
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
			<main class='fixed inset-0 z-9998' onClick={closeAll}>
				<Show when={boxes().length > 0}>
					<BoxCanvas boxes={boxes} text={fullText}/>
				</Show>

				<Show when={floatingTranslation() !== null}>
					<FloatingTranslation
						data={floatingTranslation()!}
						onClose={() => setFloatingTranslation(null)}
					/>
				</Show>

				<Show when={showFullTranslation() && fullText()}>
					<div
						class={`fixed z-10002 ${
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

									<p class='text-xs  line-clamp-4'>{fullText()}</p>

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
									<p class='text-sm  whitespace-pre-wrap'>{fullText()}</p>
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
								const [text, resultBoxes] = await getBlockTranslate(
									[rect.x, rect.y],
									[rect.w, rect.h],
								);

								log.info(
									'[LAYOUT][EVENT][translate_fragment]Translate fragment with payload: ' +
										JSON.stringify(resultBoxes),
								);

								if (!text && !resultBoxes.length) return;

								if (mode === 'persistent') {
									setFloatingTranslation({
										area: rect,
										text: text,
									});

									setCursorEvents(false);
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
