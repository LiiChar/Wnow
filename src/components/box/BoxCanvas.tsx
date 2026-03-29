import { For, Accessor } from "solid-js";
import { BoxElement } from "./BoxElement";
import { convexHull } from "@/shared/lib/points";
import { TextBox } from "@/shared/types/ocr";
import { log } from "@/shared/lib/log";
import concaveman from "concaveman";

interface BoxCanvasProps {
  boxes: Accessor<TextBox[]>;
  text: Accessor<string>;
}

function isCloseOrIntersect(a: TextBox, b: TextBox, padding = 10) {
	const ax2 = a.x + a.w;
	const ay2 = a.y + a.h;
	const bx2 = b.x + b.w;
	const by2 = b.y + b.h;

	// расширяем боксы (чтобы ловить "почти рядом")
	return !(
		ax2 + padding < b.x ||
		bx2 + padding < a.x ||
		ay2 + padding < b.y ||
		by2 + padding < a.y
	);
}

function mergeBoxes(group: TextBox[]): TextBox {
	const minX = Math.min(...group.map(b => b.x));
	const minY = Math.min(...group.map(b => b.y));
	const maxX = Math.max(...group.map(b => b.x + b.w));
	const maxY = Math.max(...group.map(b => b.y + b.h));

	return {
		id: group[0].id,
		x: minX,
		y: minY,
		w: maxX - minX,
		h: maxY - minY,
		text: group.map(b => b.text).join(' '),
		translation: group.map(b => b.translation || '').join(' '),
	};
}


export function groupBoxes(boxes: TextBox[], padding = 10): TextBox[] {
	const used = new Set<number>();
	const result: TextBox[] = [];

	for (let i = 0; i < boxes.length; i++) {
		if (used.has(i)) continue;

		const stack = [i];
		const group: TextBox[] = [];

		while (stack.length) {
			const idx = stack.pop()!;
			if (used.has(idx)) continue;

			used.add(idx);
			group.push(boxes[idx]);

			for (let j = 0; j < boxes.length; j++) {
				if (!used.has(j) && isCloseOrIntersect(boxes[idx], boxes[j], padding)) {
					stack.push(j);
				}
			}
		}

		result.push(mergeBoxes(group));
	}

	return result;
}


interface BoxPolygonProps {
	boxes: TextBox[];
}

export const BoxPolygon = (props: BoxPolygonProps) => {
	if (!props.boxes.length) return null;

  log.info('[BOX_CANVAS] Boxes: ' + JSON.stringify(props.boxes));

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

	// строка для SVG polygon
	const pointsAttr = hull.map(p => p.join(',')).join(' ');

	log.info('[BOX_CANVAS] Calculated hull points: ' + pointsAttr);

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
			/>
		</svg>
	);
};

export const BoxCanvas = (props: BoxCanvasProps) => {
  const grouped = groupBoxes(props.boxes(), 12);

  if (grouped.length === 1) {
    grouped[0].translation = props.text();
  }

  return (
		<div class='fixed inset-0 z-9999 pointer-events-auto'>
			<BoxPolygon boxes={props.boxes()} />
			<For each={grouped}>
				{(box, i) => <BoxElement box={box} index={i()} />}
			</For>
		</div>
	);
};
