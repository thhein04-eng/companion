import {
  DEAL_FIELD_STEPS,
  DOWN_PAYMENT_STEPS,
  type DealFieldKey,
} from './deal-fields';
import type { DownPayment } from './types';

/** Valid range per field (data-model §A): currency ≥ 0, rate 0–100, term 1–480 months, PMI ≥ 0. */
function rangeOf(key: DealFieldKey): [number, number] {
  if (key === 'annualInterestRatePct') return [0, 100];
  if (key === 'termMonths') return [1, 480];
  return [0, Number.POSITIVE_INFINITY];
}

const decimalsOf = (n: number) => (String(n).split('.')[1] ?? '').length;

/**
 * Cleans float noise without losing precision: rounds to the finer of the step's and the
 * starting value's decimals, so 0.5 + 0.05 is exactly 0.55 and 6.4375 + 0.01 stays 6.4475.
 */
function snap(n: number, step: number, from: number): number {
  return Number(n.toFixed(Math.max(decimalsOf(step), decimalsOf(from))));
}

const clamp = (n: number, [lo, hi]: [number, number]) =>
  Math.min(hi, Math.max(lo, n));

/**
 * Moves a shared input by `steps` (negative = down) using its data-model §A step, clamped to
 * the field's valid range. Shift is ×10, applied by the caller as `steps * 10`. A down-payment
 * percent steps 0.1 point within 0–99, and an amount steps $100. The value moves by exact
 * steps from where it is; it is never rounded onto a step grid. `null` and fields without a
 * step come back unchanged.
 */
export function stepValue<V>(key: DealFieldKey, value: V, steps: number): V {
  if (value == null) return value;
  if (key === 'downPayment') {
    const dp = value as unknown as DownPayment;
    if ('percent' in dp) {
      const step = DOWN_PAYMENT_STEPS.percent;
      return {
        percent: clamp(
          snap(dp.percent + steps * step, step, dp.percent),
          [0, 99],
        ),
      } as V;
    }
    const step = DOWN_PAYMENT_STEPS.amount;
    return {
      amount: Math.max(0, snap(dp.amount + steps * step, step, dp.amount)),
    } as V;
  }
  const step = DEAL_FIELD_STEPS[key];
  if (step == null || typeof value !== 'number') return value;
  return clamp(snap(value + steps * step, step, value), rangeOf(key)) as V;
}
