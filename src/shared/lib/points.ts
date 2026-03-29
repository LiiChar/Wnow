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
