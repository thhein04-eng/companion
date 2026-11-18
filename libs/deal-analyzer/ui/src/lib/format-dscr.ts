/** `1.19×`, or `−0.12×` with a true minus sign (spec 006 FR-015). */
export function formatDscr(value: number): string {
  const text = `${Math.abs(value).toFixed(2)}×`;
  return value < 0 && text !== '0.00×' ? `−${text}` : text;
}

/** `1.25×` for a minimum, always two decimals. */
export function formatDscrMinimum(minimum: number): string {
  return `${minimum.toFixed(2)}×`;
}
