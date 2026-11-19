import { DEAL_FIELD_STEPS, type DealFieldKey } from './deal-fields';
import type { DownPayment } from './types';

/** Valid range per field (data-model §A): currency ≥ 0, rate 0–100, term 1–480 months, PMI ≥ 0. */
function rangeOf(key: DealFieldKey): [number, number] {
  if (key === 'annualInterestRatePct') return [0, 100];
  if (key === 'termMonths') return [1, 480];
  return [0, Number.POSITIVE_INFINITY];
}

/** Rounds to the step's own precision, so 0.5 + 0.05 is exactly 0.55. */
function snap(n: number, step: number): number {
  const decimals = (String(step).split('.')[1] ?? '').length;
  return Number(n.toFixed(decimals));
}

const clamp = (n: number, [lo, hi]: [number, number]) =>
  Math.min(hi, Math.max(lo, n));

/**
 * Moves a shared input by `steps` (negative = down) using its data-model §A step, clamped to
 * the field's valid range. Shift is ×10, applied by the caller as `steps * 10`. A down-payment
 * percent steps 1 point within 0–99, and an amount steps $1,000. `null` and fields without a
 * step come back unchanged.
 */
export function stepValue<V>(key: DealFieldKey, value: V, steps: number): V {
  if (value == null) return value;
  if (key === 'downPayment') {
    const dp = value as unknown as DownPayment;
    if ('percent' in dp) {
      return { percent: clamp(snap(dp.percent + steps, 1), [0, 99]) } as V;
    }
    return { amount: Math.max(0, dp.amount + steps * 1_000) } as V;
  }
  const step = DEAL_FIELD_STEPS[key];
  if (step == null || typeof value !== 'number') return value;
  return clamp(snap(value + steps * step, step), rangeOf(key)) as V;
}
