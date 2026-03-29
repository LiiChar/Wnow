import { getBlockTranslate } from '@/shared/api/translate';
import { TextBox } from '@/shared/types/ocr';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { createSignal, onMount, onCleanup, createEffect, For, Show } from 'solid-js';
import fitty from 'fitty';
import { log } from '@/shared/lib/log';
import { listen } from '@tauri-apps/api/event';

export type Area = {
	x: number;
	y: number;
	w: number;
	h: number;
};

export type FloatingTranslationType = {
	text: string;
	area: Area;
};

type Props = {
	data: FloatingTranslationType;
	onClose?: (id: string) => void;
};

export function isInBox(
	device_x: number,
	device_y: number,
	web_box_size: Area,
): boolean {
	const top = web_box_size.y;
	const left = web_box_size.x;
	const width = web_box_size.w;
	const height = web_box_size.h;
	device_x = device_x / window.devicePixelRatio;
	device_y = device_y / window.devicePixelRatio;

	return (
		device_x >= left &&
		device_x <= left + width &&
		device_y >= top &&
		device_y <= top + height
	);
}

export function FloatingTranslation(props: Props) {
	const [translation, setTranslation] = createSignal<TextBox[]>([]);
	const [hide, setHide] = createSignal(false);

	// позиция (чтобы можно было двигать)
	const [pos, setPos] = createSignal({
		x: props.data.area.x,
		y: props.data.area.y,
	});

	let interval: NodeJS.Timeout | undefined;

	onMount(() => {
		interval = setInterval(async () => {
			try {
				const [_text, boxes] = await getBlockTranslate(
					[pos().x, pos().y],
					[props.data.area.w, props.data.area.h],
				);

				log.info("[]FloatingTranslation:", boxes.map(b => b.translation).join('.'));

				setTranslation(boxes);
			} catch (e) {
				console.error(e);
			}
		}, 1000);


	});

	onCleanup(() => {
		if (interval) clearInterval(interval);
	});

	createEffect(() => {
		translation();
	});

	return (
			<div
				class='fixed z-10001 pointer-events-auto select-none animate-fade-in'
				onClick={e => e.stopPropagation()}
			>
				<div
					class='absolute border-2 border-border rounded select-none cursor-move'
					style={{
						left: `${pos().x}px`,
						top: `${pos().y}px`,
						width: `${props.data.area.w}px`,
						height: `${props.data.area.h}px`,
					}}
				>
					<For each={translation()}>
						{box => {
							return (
								<div
									ref={el => {
										// fitty(el);
										// if (el) {
										// 	fitTextToBox(el, box.translation ?? box.text);
										// }
									}}
									class='absolute border border-border bg-background/90 rounded overflow-hidden flex items-center justify-center text-center'
									style={{
										left: `${box.x}px`,
										top: `${box.y}px`,
										width: `${box.w}px`,
										height: `${box.h}px`,
									}}
								>
									{box.translation ?? box.text}
								</div>
							);
						}}
					</For>
				</div>
			</div>
	);
}
