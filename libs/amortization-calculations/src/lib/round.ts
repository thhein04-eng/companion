/** Rounds a dollar amount to the nearest cent. Internal helper shared by calculation modules. */
export function roundCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
