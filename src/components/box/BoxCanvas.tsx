import type { Accessor } from "solid-js";

import concaveman from "concaveman";
import roundPolygon, { getSegments } from "round-polygon";
import { For } from "solid-js";

import type { TextBox } from "@/shared/types/ocr";

import { groupBoxes } from "@/shared/lib/points";

import { BoxElement } from "./BoxElement";

interface BoxCanvasProps {
  boxes: Accessor<TextBox[]>;
  text: Accessor<string>;
}


interface BoxPolygonProps {
	boxes: TextBox[];
}

export const BoxPolygon = (props: BoxPolygonProps) => {
	if (!props.boxes.length) return null;

	// собираем все углы всех боксов
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
				fill='rgba(255,255,255,0.1)'
				points={pointsAttr}
				stroke='rgba(255,255,255,0.4)'
				stroke-linecap='round'
				stroke-linejoin='round'
				stroke-width={2}
			/>
		</svg>
	);
};

export const BoxCanvas = (props: BoxCanvasProps) => {
  const grouped = groupBoxes(props.boxes(), 12);

  if (grouped.length === 1) {
    grouped[0].grouped.translation = props.text();
  }

  return (
		<div class='fixed inset-0 z-9999 pointer-events-auto'>
			{/* <For each={grouped}>
				{(item) => <BoxPolygon boxes={item.boxes} />}
			</For> */}
			<For each={props.boxes()}>
				{(item, i) => <BoxElement box={item} index={i()} />}
			</For>
		</div>
	);
};
