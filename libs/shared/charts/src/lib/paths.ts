const round = (n: number) => Math.round(n * 100) / 100;

/** An SVG path through `points`, starting a new subpath after each `null` gap. */
export function linePath(points: ({ x: number; y: number } | null)[]): string {
  let d = '';
  let drawing = false;
  for (const p of points) {
    if (p == null) {
      drawing = false;
      continue;
    }
    d += `${drawing ? 'L' : 'M'}${round(p.x)},${round(p.y)}`;
    drawing = true;
  }
  return d;
}

/**
 * A rectangle with its outer end rounded (radius `min(r, w/2, h)`) and its baseline end square.
 * `'up'` rounds the top (positive bars); `'down'` rounds the bottom (negative bars).
 * `(x, y)` is the top-left corner in SVG coordinates.
 */
export function roundedTopRect(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  direction: 'up' | 'down' = 'up',
): string {
  if (!(w > 0) || !(h > 0)) return '';
  const rr = round(Math.max(0, Math.min(r, w / 2, h)));
  const [x0, y0, x1, y1] = [round(x), round(y), round(x + w), round(y + h)];
  if (direction === 'up') {
    return (
      `M${x0},${y1}L${x0},${round(y0 + rr)}Q${x0},${y0} ${round(x0 + rr)},${y0}` +
      `L${round(x1 - rr)},${y0}Q${x1},${y0} ${x1},${round(y0 + rr)}L${x1},${y1}L${x0},${y1}Z`
    );
  }
  return (
    `M${x0},${y0}L${x1},${y0}L${x1},${round(y1 - rr)}Q${x1},${y1} ${round(x1 - rr)},${y1}` +
    `L${round(x0 + rr)},${y1}Q${x0},${y1} ${x0},${round(y1 - rr)}Z`
  );
}
