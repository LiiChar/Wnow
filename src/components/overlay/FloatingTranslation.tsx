import { listen } from '@tauri-apps/api/event';
import concaveman from 'concaveman';
import roundPolygon, { getSegments } from 'round-polygon';
import { createSignal, For, onCleanup, onMount, Show } from 'solid-js';

import type { GroupedBox } from '@/shared/lib/points';
import type { TextBox } from '@/shared/types/ocr';

import { getSettings } from '@/shared/api/settings';
import { startFloatingImageTranslate, startFloatingTranslate } from '@/shared/api/translate';
import { log } from '@/shared/lib/log';
import { groupBoxes } from '@/shared/lib/points';

import { BoxElement } from '../box/BoxElement';

export interface Area {
	h: number;
	w: number;
	x: number;
	y: number;
}

export interface FloatingTranslationType {
	area: Area;
	text: string;
}

interface Props {
	data: FloatingTranslationType;
	onClose?: (id: string) => void;
}

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
	const hull = concaveman(allPoints, 2);

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
			height='100vh'
			width='100vw'
		>
			<polygon
				fill='rgba(0,0,0,0.9)'
				points={pointsAttr}
				stroke='rgba(0,0,0,0.4)'
				stroke-linecap='round'
				stroke-linejoin='round'
				stroke-width={2}
			/>
		</svg>
	);
};

export const FloatingTranslation = (props: Props) => {
	const [translation, setTranslation] = createSignal<TextBox[]>([]);
	const [translationGrouped, setTranslationGrouped] = createSignal<GroupedBox[]>([]);



	onMount(async () => {
		const unsubs: (() => void)[] = [];
		const settings = await getSettings();

		const add = async <T,>(
			event: string,
			handler: (e: { payload: T }) => void,
		) => {
			const un = await listen<T>(event, handler);
			unsubs.push(un);
		};
		
		add<[string, TextBox[]]>('floating_translate', async ({ payload }) => {
			log.info(
				`[LAYOUT][EVENT][floating_translate]Listened to floating_translate event with payload: ${ 
					JSON.stringify(payload)}`,
			);
			

			if (settings.image_replacement) {
				setTranslation(payload[1]);
			} else {
				setTranslationGrouped(groupBoxes(payload[1]));
			}
		});

		if (settings.image_replacement) {
			await startFloatingImageTranslate([props.data.area.x, props.data.area.y], [props.data.area.w, props.data.area.h]);
		} else {
			await startFloatingTranslate([props.data.area.x, props.data.area.y], [props.data.area.w, props.data.area.h]);
		}
		
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
				style={{
					left: `${props.data.area.x}px`,
					top: `${props.data.area.y}px`,
					width: `${props.data.area.w}px`,
					height: `${props.data.area.h}px`,
				}}
				class='absolute border-2 border-border rounded select-none cursor-move'
			>
				<Show when={translationGrouped().length > 0}>
					<For each={translationGrouped()}>{item => <BoxPolygon boxes={item.boxes} />}</For>
					<For each={translationGrouped()}>
						{box => (
							<div
							style={{
								left: `${box.grouped.x}px`,
								top: `${box.grouped.y}px`,
								width: `${box.grouped.w}px`,
								height: `${box.grouped.h}px`,
							}}
							class='absolute overflow-hidden p-1'
							>
									{box.grouped.translation ?? box.grouped.text}
								</div>
							)}
					</For>
				</Show>
				<Show when={translation().length > 0}>
					<For each={translation()}>
						{box => (
							<BoxElement box={box} showPopover={false} />
						)}
					</For>
				</Show>
			</div>
		</div>
	);
}

	