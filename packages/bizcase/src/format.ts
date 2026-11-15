/** Money in EUR for presentation. Calculations never round; only this function does. */
export function formatMoney(v: number): string {
  const sign = v < 0 ? '-' : '';
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${sign}€${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 100_000) return `${sign}€${Math.round(a / 1000)}K`;
  return `${sign}€${Math.round(a).toLocaleString('en-US')}`;
}

export function formatPayback(m: number | null): string {
  return m === null ? 'Not within 36 months' : `Month ${m}`;
}

export function formatRoi(r: number | null): string {
  return r === null ? 'n/a' : `${Math.round(r)}%`;
}
