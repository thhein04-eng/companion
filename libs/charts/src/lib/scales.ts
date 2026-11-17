export interface LinearScale {
  (value: number): number;
  invert(pixel: number): number;
  domain(): [number, number];
  range(): [number, number];
}

/** Maps `domain` linearly onto `range`. A zero-width domain maps everything to the range's middle. */
export function linearScale(domain: [number, number], range: [number, number]): LinearScale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0;
  const scale = ((value: number) =>
    span === 0 ? (r0 + r1) / 2 : r0 + ((value - d0) / span) * (r1 - r0)) as LinearScale;
  scale.invert = (pixel: number) => (r1 === r0 ? d0 : d0 + ((pixel - r0) / (r1 - r0)) * span);
  scale.domain = () => [d0, d1];
  scale.range = () => [r0, r1];
  return scale;
}

export interface BandScale {
  (key: string): number;
  bandwidth: number;
  step: number;
}

/** Splits `range` into equal bands, one per key, separated by `paddingInner` (fraction of a step). */
export function bandScale(keys: string[], range: [number, number], paddingInner: number): BandScale {
  const [r0, r1] = range;
  const n = Math.max(1, keys.length);
  // Outer padding of half the inner padding on each side keeps the first/last bands off the axes,
  // so n bands plus n−1 inner gaps plus two half-gaps is exactly n steps.
  const step = (r1 - r0) / n;
  const bandwidth = step * (1 - paddingInner);
  const offset = r0 + (step * paddingInner) / 2;
  const index = new Map(keys.map((k, i) => [k, i]));
  const scale = ((key: string) => offset + (index.get(key) ?? 0) * step) as BandScale;
  scale.bandwidth = bandwidth;
  scale.step = step;
  return scale;
}

function niceStep(rawStep: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const residual = rawStep / magnitude;
  // Round to the nearest of 1/2/5/10 in log space (the same thresholds d3 uses), so the tick count
  // lands close to the requested count rather than always rounding the step up.
  const nice = residual >= Math.sqrt(50) ? 10 : residual >= Math.sqrt(10) ? 5 : residual >= Math.sqrt(2) ? 2 : 1;
  return nice * magnitude;
}

/**
 * About `count` "nice" ticks (1/2/5 × 10ⁿ steps) covering `[min, max]`.
 * Includes 0 whenever the domain spans it; never returns duplicates.
 */
export function niceTicks(min: number, max: number, count: number, opts: { integer?: boolean } = {}): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0];
  if (min === max) return [min];
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  let step = niceStep((hi - lo) / Math.max(1, count));
  if (opts.integer) step = Math.max(1, Math.round(step));
  const start = Math.floor(lo / step) * step;
  const end = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  for (let v = start; v <= end + step / 2; v += step) {
    const rounded = Number(v.toFixed(decimals));
    if (ticks[ticks.length - 1] !== rounded) ticks.push(rounded === 0 ? 0 : rounded);
  }
  return ticks;
}

/**
 * The y-extent of a set of values. `'zero-based'` → `[0, max(0, …)]`;
 * `'auto'` → `[min(0, …), max(0, …)]`. Empty or all-zero data gives `[0, 1]`.
 */
export function yExtent(values: (number | null)[], mode: 'zero-based' | 'auto'): [number, number] {
  let lo = 0;
  let hi = 0;
  for (const v of values) {
    if (v == null || !Number.isFinite(v)) continue;
    if (v > hi) hi = v;
    if (mode === 'auto' && v < lo) lo = v;
  }
  if (lo === 0 && hi === 0) return [0, 1];
  return [lo, hi];
}
