import { TextBox } from "../types/ocr";

type ConvexHullPoint = [number, number];

export function convexHull(points: ConvexHullPoint[]): ConvexHullPoint[] {
	points.sort(function (a, b) {
		return a[0] == b[0] ? a[1] - b[1] : a[0] - b[0];
	});

	var n = points.length;
	var hull = [];

	for (var i = 0; i < 2 * n; i++) {
		var j = i < n ? i : 2 * n - 1 - i;
		while (
			hull.length >= 2 &&
			removeMiddle(hull[hull.length - 2], hull[hull.length - 1], points[j])
		)
			hull.pop();
		hull.push(points[j]);
	}

	hull.pop();
	return hull;
}

function removeMiddle(a: ConvexHullPoint, b: ConvexHullPoint, c: ConvexHullPoint) {
	var cross = (a[0] - b[0]) * (c[1] - b[1]) - (a[1] - b[1]) * (c[0] - b[0]);
	var dot = (a[0] - b[0]) * (c[0] - b[0]) + (a[1] - b[1]) * (c[1] - b[1]);
	return cross < 0 || (cross == 0 && dot <= 0);
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

export interface GroupedBox {
	grouped: TextBox;
	boxes: TextBox[];
}

export function groupBoxes(boxes: TextBox[], padding = 10): GroupedBox[] {
	const used = new Set<number>();
	const result: GroupedBox[] = [];

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

		result.push({
			grouped: mergeBoxes(group),
			boxes: group,
		});
	}

	return result;
}
