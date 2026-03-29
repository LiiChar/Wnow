import { getBlockTranslate, startFloatingTranslate } from '@/shared/api/translate';
import { TextBox } from '@/shared/types/ocr';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { createSignal, onMount, onCleanup, createEffect, For, Show } from 'solid-js';
import fitty from 'fitty';
import { log } from '@/shared/lib/log';
import { listen } from '@tauri-apps/api/event';
import concaveman from 'concaveman';
import roundPolygon, { getSegments } from 'round-polygon';
import { groupBoxes, GroupedBox } from '@/shared/lib/points';

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

interface BoxPolygonProps {
	boxes: TextBox[];
}

export const BoxPolygon = (props: BoxPolygonProps) => {
	if (!props.boxes.length) return null;

	const allPoints: [number, number][] = [];
	props.boxes.forEach(b => {
		allPoints.push([b.x, b.y]); // левый верх
		allPoints.push([b.x + b.w, b.y]); // правый верх
		allPoints.push([b.x + b.w, b.y + b.h]); // правый низ
		allPoints.push([b.x, b.y + b.h]); // левый низ
	});

	// concave hull, concavity=2 → чем меньше, тем точнее повторяет форму
	let hull = concaveman(allPoints, 2);

	hull.pop();

	// преобразуем в формат для round-polygon
	const polygonPoints = hull.map(([x, y]) => ({ x, y }));

	// скругляем углы (радиус = 12px)
	const rounded = roundPolygon(polygonPoints, 6);

	// получаем сегменты для отрисовки
	const segments = getSegments(rounded, 'LENGTH', 5);

	// строка для SVG polygon
	const pointsAttr = segments.map(p => `${p.x},${p.y}`).join(' ');

	return (
		<svg
			class='absolute inset-0 pointer-events-none'
			width='100vw'
			height='100vh'
		>
			<polygon
				points={pointsAttr}
				fill='rgba(0,0,0,0.9)'
				stroke='rgba(0,0,0,0.4)'
				stroke-width={2}
				stroke-linejoin='round'
				stroke-linecap='round'
			/>
		</svg>
	);
};

export function FloatingTranslation(props: Props) {
	const [translation, setTranslation] = createSignal<GroupedBox[]>([]);



	onMount(async () => {
		const unsubs: (() => void)[] = [];

		const add = async <T,>(
			event: string,
			handler: (e: { payload: T }) => void,
		) => {
			const un = await listen<T>(event, handler);
			unsubs.push(un);
		};
		
		add<[string, TextBox[]]>('floating_translate', ({ payload }) => {
			log.info(
				'[LAYOUT][EVENT][floating_translate]Listened to floating_translate event with payload: ' +
					JSON.stringify(payload),
			);

			let grouped = groupBoxes(payload[1]);


			setTranslation(grouped);
		});

		await startFloatingTranslate([props.data.area.x, props.data.area.y], [props.data.area.w, props.data.area.h]);
		
		onCleanup(() => {
			unsubs.forEach(fn => fn());
		});
	});

	return (
		<div
			class='fixed z-10001 pointer-events-auto select-none animate-fade-in'
			onClick={e => e.stopPropagation()}
		>
			<div
				class='absolute border-2 border-border rounded select-none cursor-move'
				style={{
					left: `${props.data.area.x}px`,
					top: `${props.data.area.y}px`,
					width: `${props.data.area.w}px`,
					height: `${props.data.area.h}px`,
				}}
			>
				<For each={translation()}>{item => <BoxPolygon boxes={item.boxes} />}</For>
				<For each={translation()}>
					{box => {
						return (
							<div
								class='absolute overflow-hidden p-1'
								style={{
									left: `${box.grouped.x}px`,
									top: `${box.grouped.y}px`,
									width: `${box.grouped.w}px`,
									height: `${box.grouped.h}px`,
								}}
							>
								{box.grouped.translation ?? box.grouped.text}
							</div>
						);
					}}
				</For>
			</div>
		</div>
	);
}
