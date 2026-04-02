import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import {
	createSignal,
	onCleanup,
	onMount,
	Show,
} from 'solid-js';

import { getSettings } from '@/shared/api/settings';
import { getBlockImageTranslate, getBlockTranslate } from '@/shared/api/translate';
import { listener } from '@/shared/lib/listener';
import { log } from '@/shared/lib/log';

import type {FloatingTranslationType} from '../../components/overlay/FloatingTranslation';
import type { SelectionMode } from '../../components/overlay/SelectionArea';
import type { TextBox } from '../../shared/types/ocr';

import { BoxCanvas } from '../../components/box/BoxCanvas';
import { FloatingTranslation  } from '../../components/overlay/FloatingTranslation';
import { SelectionArea } from '../../components/overlay/SelectionArea';

export const TranslatorOverlay = () => {
	const [isSelectFragment, setIsSelectFragment] = createSignal(false);
	const [boxes, setBoxes] = createSignal<TextBox[]>([]);
	const [fullText, setFullText] = createSignal('');

	const [floatingTranslation, setFloatingTranslation] =
		createSignal<FloatingTranslationType | null>(null);

	const setCursorEvents = (enabled: boolean) => {
		getCurrentWebviewWindow().setIgnoreCursorEvents(!enabled);
	};

	onMount(() => {
		const {add, unsubs} = listener();

		add<TextBox[]>('show_translate', ({ payload }) => {
			log.info(`[LAYOUT][EVENT][show_translate]Listened to show_translate event with payload: ${  JSON.stringify(payload)}`);
			setBoxes(payload);
			setCursorEvents(true);
		});

		// Новое событие для изображения с заменой текста
		add<TextBox[]>('show_translate_fragments', ({ payload }) => {
			log.info('[LAYOUT][EVENT][show_translate_fragments] Received translated image');
			setBoxes(payload);
			setCursorEvents(true);
		});

		add<void>('translate_fragment', () => {
			log.info('[LAYOUT][EVENT][translate_fragment]Listened to translate_fragment event');
			setCursorEvents(true);
			setIsSelectFragment(true);
		});

		add<void>('close_translate', () => {
			setFloatingTranslation(null);
		});

		onCleanup(() => {
			unsubs.forEach(fn => fn());
		});
	});

	const closeAll = () => {
		if (!isSelectFragment() && floatingTranslation() === null) {
			setBoxes([]);
			setFullText('');
			setFloatingTranslation(null);
			setCursorEvents(false);
		}
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

				{isSelectFragment() && (
					<SelectionArea
						onCancel={() => setIsSelectFragment(false)}
						onConfirm={async (rect, mode: SelectionMode) => {
							setIsSelectFragment(false);

							try {
								const settings = await getSettings();

								let text;
								let resultBoxes;

								if (settings.image_replacement) {
									[text, resultBoxes] = await getBlockImageTranslate(
										[rect.x, rect.y],
										[rect.w, rect.h],
									);
								} else {
									[text, resultBoxes] = await getBlockTranslate(
										[rect.x, rect.y],
										[rect.w, rect.h],
									);
								}

								log.info(
									`[LAYOUT][EVENT][translate_fragment]Translate fragment with payload: text= ${  text  }, resultBoxes= ${  JSON.stringify(resultBoxes)}`,
								);

								if (!text && !resultBoxes.length) return;

								if (mode === 'persistent') {
									setFloatingTranslation({
										area: rect,
										text,
									});

									setCursorEvents(false);
								} else {
									setFullText(text);

									const adjusted = resultBoxes.map(b => ({
										...b,
										x: b.x + rect.x,
										y: b.y + rect.y,
									}));

									setBoxes(adjusted);
									setCursorEvents(true);
								}
							} catch (e) {
								console.error('Translation error:', e);
							}
						}}
					/>
				)}
			</main>
	);
}
