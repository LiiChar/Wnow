import { For, Accessor } from "solid-js";
import { BoxElement } from "./BoxElement";
import { TextBox } from "@/shared/types/ocr";
import { log } from "@/shared/lib/log";
import concaveman from "concaveman";
import roundPolygon, { getSegments } from "round-polygon";
import { groupBoxes } from "@/shared/lib/points";

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
				fill='rgba(255,255,255,0.1)'
				stroke='rgba(255,255,255,0.4)'
				stroke-width={2}
				stroke-linejoin='round'
				stroke-linecap='round'
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
			<For each={grouped}>
				{(item) => <BoxPolygon boxes={item.boxes} />}
			</For>
			<For each={grouped}>
				{(item, i) => <BoxElement box={item.grouped} index={i()} />}
			</For>
		</div>
	);
};
