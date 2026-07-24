export function sumByYear(entries: Array<{ year: number; amount: number }>) {
  const map = new Map<number, number>();
  for (const e of entries) map.set(e.year, (map.get(e.year) ?? 0) + e.amount);
  return map;
}

export function pickLast3(map: Map<number, number>): [number, number, number] {
  const now = new Date().getUTCFullYear();
  const years = [now - 3, now - 2, now - 1];
  return years.map((y) => Number((map.get(y) ?? 0).toFixed(4))) as [number, number, number];
}

export function historyFromMap(
  map: Map<number, number>,
  count = 5,
): { year: number; amount: number }[] {
  const now = new Date().getUTCFullYear();
  const out: { year: number; amount: number }[] = [];
  for (let i = count; i >= 1; i--) {
    const y = now - i;
    out.push({ year: y, amount: Number((map.get(y) ?? 0).toFixed(4)) });
  }
  return out;
}

export function dividendCagrPct(history: { year: number; amount: number }[]): number | null {
  const positive = history.filter((h) => h.amount > 0);
  if (positive.length < 2) return null;
  const first = positive[0].amount;
  const last = positive[positive.length - 1].amount;
  const years = positive[positive.length - 1].year - positive[0].year;
  if (!first || !last || years <= 0) return null;
  return (Math.pow(last / first, 1 / years) - 1) * 100;
}

/** Extract unique months (1-12) an asset historically paid dividends in the last ~48 months. */
export function paymentMonthsFromDates(dates: (string | number | null | undefined)[]): number[] {
  const cutoff = Date.now() - 48 * 30 * 24 * 60 * 60 * 1000; // ~48 months
  const set = new Set<number>();
  for (const d of dates) {
    if (d == null) continue;
    const ms = typeof d === "number" ? (d > 1e12 ? d : d * 1000) : new Date(d).getTime();
    if (!Number.isFinite(ms) || ms < cutoff || ms > Date.now()) continue;
    const m = new Date(ms).getUTCMonth() + 1;
    if (m >= 1 && m <= 12) set.add(m);
  }
  return Array.from(set).sort((a, b) => a - b);
}
