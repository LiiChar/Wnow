import { getBlockTranslate } from '@/shared/api/translate';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { createSignal, onMount, onCleanup, createEffect } from 'solid-js';

export type Area = {
	x: number;
	y: number;
	w: number;
	h: number;
}

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
	const [translation, setTranslation] = createSignal<string>(props.data.text);

	// позиция (чтобы можно было двигать)
	const [pos, setPos] = createSignal({
		x: props.data.area.x,
		y: props.data.area.y,
	});

	const [isDragging, setIsDragging] = createSignal(false);
	const [offset, setOffset] = createSignal({ x: 0, y: 0 });

	let interval: NodeJS.Timeout | undefined;
	let textRef: HTMLDivElement | undefined;

	// 🔁 авто обновление перевода
	onMount(() => {
		interval = setInterval(async () => {
			try {
				const [text] = await getBlockTranslate([pos().x, pos().y], [props.data.area.w, props.data.area.h]);

				setTranslation(text);
			} catch (e) {
				console.error(e);
			}
		}, 1000);

    const appWebview = getCurrentWebviewWindow();
		appWebview.setIgnoreCursorEvents(false);

		let isIgnored: boolean | null = null;
		let isDragging: boolean = false;
		// rust backend emits mouse position in "device-mouse-move" event with udev
		// frontend can use this as an alternative to the "mousemove" event
		appWebview.listen<{ x: number; y: number }>(
			'device-mouse-move',
			async ({ payload }) => {
				// Note that CSS pixel is different from device pixel.
				// See [this doc](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio)
				const inHitbox = isInBox(payload.x, payload.y, {
          h: props.data.area.h,
          w: props.data.area.w,
          x: pos().x,
          y: pos().y,
        });
				const shouldIgnore = !isDragging && !inHitbox;
				// const shouldIgnore = !isDragging && !inHitbox
				if (shouldIgnore != isIgnored) {
          console.log(`
            x: ${payload.x}, y: ${payload.y}, 
            inHitbox: ${inHitbox}
            isDragging: ${isDragging}
            isIgnored: ${isIgnored} -> ${shouldIgnore}
          `);
					appWebview.setIgnoreCursorEvents(shouldIgnore);
					isIgnored = shouldIgnore;
				}
			},
		);
	});

	onCleanup(() => {
		if (interval) clearInterval(interval);
	});

	// 🖱️ drag logic
	const onMouseDown = (e: MouseEvent) => {
		e.stopPropagation();
		setIsDragging(true);
		setOffset({
			x: e.clientX - pos().x,
			y: e.clientY - pos().y,
		});
	};

	const onMouseMove = (e: MouseEvent) => {
		if (!isDragging()) return;

		setPos({
			x: e.clientX - offset().x,
			y: e.clientY - offset().y,
		});
	};

	const onMouseUp = () => {
		setIsDragging(false);
	};

	onMount(() => {
		window.addEventListener('mousemove', onMouseMove);
		window.addEventListener('mouseup', onMouseUp);
	});

	onCleanup(() => {
		window.removeEventListener('mousemove', onMouseMove);
		window.removeEventListener('mouseup', onMouseUp);
	});

	// 🔤 авто размер текста (fit-to-box)
	const fitText = () => {
		if (!textRef) return;

		const el = textRef;
		const parent = el.parentElement;
		if (!parent) return;

		let fontSize = 32; // старт
		el.style.fontSize = fontSize + 'px';

		while (
			(el.scrollHeight > parent.clientHeight ||
				el.scrollWidth > parent.clientWidth) &&
			fontSize > 8
		) {
			fontSize -= 1;
			el.style.fontSize = fontSize + 'px';
		}
	};

	createEffect(() => {
		translation();
		queueMicrotask(fitText);
	});

	return (
		<div
			class='fixed z-10001 pointer-events-auto select-none animate-fade-in'
			onClick={e => e.stopPropagation()}
		>
			<div
				class='absolute border-2 border-border rounded overflow-hidden select-none cursor-move'
				style={{
					left: `${pos().x}px`,
					top: `${pos().y}px`,
					width: `${props.data.area.w}px`,
					height: `${props.data.area.h}px`,
				}}
				onMouseDown={onMouseDown}
			>
				<div class='glass-dark w-full h-full border border-border shadow-xl overflow-hidden'>
					<div class='w-full h-full flex items-center justify-center p-2'>
						<div
							ref={el => (textRef = el)}
							class='text-center break-words leading-tight'
							style={{
								'word-break': 'break-word',
							}}
						>
							{translation()}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
