/**
 * Annual IRR of year-end cash flows (t = 0…n), or null when it is undefined (spec 009 R4).
 *
 * Brackets r in [−0.99, 10] and bisects on NPV(r). With one sign change (an outflow first, then
 * inflows) there is exactly one root in the bracket, so bisection always converges.
 */
export function irr(cashFlows: number[]): number | null {
  if (cashFlows.length < 2 || !(cashFlows[0] < 0)) return null;
  const npv = (r: number) =>
    cashFlows.reduce((sum, cf, t) => sum + cf / (1 + r) ** t, 0);
  let lo = -0.99;
  let hi = 10;
  let fLo = npv(lo);
  const fHi = npv(hi);
  if (!Number.isFinite(fLo) || !Number.isFinite(fHi)) return null;
  if (fLo === 0) return lo;
  if (fHi === 0) return hi;
  if (Math.sign(fLo) === Math.sign(fHi)) return null;
  for (let i = 0; i < 200 && hi - lo >= 1e-10; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid);
    if (fMid === 0) return mid;
    if (Math.sign(fMid) === Math.sign(fLo)) {
      lo = mid;
      fLo = fMid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}
