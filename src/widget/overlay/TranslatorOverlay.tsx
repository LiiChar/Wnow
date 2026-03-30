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
import { Check, Copy, FoldVertical, Trash, Image as ImageIcon, X } from 'lucide-solid';
import { toaster } from '@kobalte/core/toast';
import { ToastStatus } from '@/components/toaster/ToastStatus';
import { log } from '@/shared/lib/log';
import { getBlockTranslate } from '@/shared/api/translate';
import { listener } from '@/shared/lib/listener';
import { showNotification } from '@/shared/api/notification';

interface TranslatedImagePayload {
	image: string;
	width: number;
	height: number;
	processing_time_ms: number;
	boxes_count: number;
}

export function TranslatorOverlay() {
	const [isSelectFragment, setIsSelectFragment] = createSignal(false);
	const [boxes, setBoxes] = createSignal<TextBox[]>([]);
	const [fullText, setFullText] = createSignal('');
	const [showFullTranslation, setShowFullTranslation] = createSignal(false);
	const [fullCopied, setFullCopied] = createSignal(false);
	const [isCompactMode, setIsCompactMode] = createSignal(true);

	const [translatedImage, setTranslatedImage] = createSignal<string | null>(null);
	const [imagePayload, setImagePayload] = createSignal<TranslatedImagePayload | null>(null);

	const [floatingTranslation, setFloatingTranslation] =
		createSignal<FloatingTranslationType | null>(null);

	const setCursorEvents = (enabled: boolean) => {
		getCurrentWebviewWindow().setIgnoreCursorEvents(!enabled);
	};

	onMount(() => {
		let {add, unsubs} = listener();

		add<TextBox[]>('show_translate', ({ payload }) => {
			log.info('[LAYOUT][EVENT][show_translate]Listened to show_translate event with payload: ' + JSON.stringify(payload));
			setBoxes(payload);
			setShowFullTranslation(false);
			setTranslatedImage(null);
			setCursorEvents(true);
		});

		// Новое событие для изображения с заменой текста
		add<TranslatedImagePayload>('show_translate_with_image', ({ payload }) => {
			log.info('[LAYOUT][EVENT][show_translate_with_image] Received translated image');
			setTranslatedImage(`data:image/png;base64,${payload.image}`);
			setImagePayload(payload);
			setBoxes([]);
			setShowFullTranslation(false);
			setCursorEvents(true);
		});

		add<void>('translate_fragment', () => {
			log.info('[LAYOUT][EVENT][translate_fragment]Listened to translate_fragment event');
			setCursorEvents(true);
			setIsSelectFragment(true);
		});

		add<void>('close_translate', () => {
			setFloatingTranslation(null);
			setTranslatedImage(null);
			setImagePayload(null);
		});

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
			setTranslatedImage(null);
			setImagePayload(null);
			setCursorEvents(false);
		}
	};


	const copyFullText = async () => {
		navigator.clipboard.writeText(fullText());
		setFullCopied(true);

		await showNotification({
			title: 'Скопировано',
			text: 'Текст был скопирован в буфер обмена',
			duration: 2000,
		});

		setTimeout(() => setFullCopied(false), 2000);
	};



	return (
			<main class='fixed inset-0 z-9998' onClick={closeAll}>
				{/* Отображение изображения с заменой текста */}
				<Show when={translatedImage() !== null}>
					<div
						class='fixed inset-0 flex items-center justify-center bg-black/80'
						onClick={e => e.stopPropagation()}
					>
						<div class='relative max-w-[95vw] max-h-[95vh]'>
							<img
								src={translatedImage()!}
								alt='Translated'
								class='max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl'
							/>
							
							{/* Информация об обработке */}
							<Show when={imagePayload()}>
								<div class='absolute top-2 left-2 glass-dark px-3 py-2 rounded-lg text-xs'>
									<div class='flex items-center gap-2 text-neutral-400'>
										<ImageIcon size={12} />
										<span>
											{imagePayload()!.boxes_count} боксов • 
											{imagePayload()!.processing_time_ms}мс
										</span>
									</div>
								</div>
							</Show>

							{/* Кнопки управления */}
							<div class='absolute top-2 right-2 flex gap-2'>
								<button
									onClick={() => {
										setTranslatedImage(null);
										setImagePayload(null);
									}}
									class='glass-dark p-2 rounded-lg hover:bg-neutral-700 transition-colors'
									title='Закрыть'
								>
									<X size={16} />
								</button>
							</div>

							{/* Кнопка переключения режима */}
							<Show when={imagePayload()}>
								<div class='absolute bottom-4 left-1/2 -translate-x-1/2'>
									<button
										onClick={() => {
											// Переключение на режим с боксами (если нужно)
											setTranslatedImage(null);
											setImagePayload(null);
										}}
										class='glass-dark px-4 py-2 rounded-lg text-xs flex items-center gap-2 hover:bg-neutral-700 transition-colors'
									>
										<Check size={12} />
										<span>Показать боксы</span>
									</button>
								</div>
							</Show>
						</div>
					</div>
				</Show>

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
									'[LAYOUT][EVENT][translate_fragment]Translate fragment with payload: text= ' + text + ', resultBoxes= ' + JSON.stringify(resultBoxes),
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
