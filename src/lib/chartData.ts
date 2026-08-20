// Shared, null/NaN-safe helpers for turning raw Supabase rows into chart
// data. Centralized here so every chart in the app handles missing data,
// bad numbers, and date-bucketing the same way instead of each screen
// reinventing (and occasionally getting wrong) its own version.

/** A single plotted point for the shared trend-chart components. */
export interface TrendPoint {
  label: string;
  value: number | null;
}

/** Coerces a possibly-missing/garbled number to a finite number, or 0. */
export const safeNumber = (n: unknown): number => {
  const v = typeof n === "number" ? n : parseFloat(String(n));
  return Number.isFinite(v) ? v : 0;
};

/** a / b, guarding against division by zero (returns 0, not NaN/Infinity). */
export const safeDiv = (a: number, b: number): number => (b > 0 ? a / b : 0);

/** Average of a numeric array, ignoring non-finite entries. 0 if empty. */
export const safeAvg = (values: number[]): number => {
  const finite = values.filter((v) => Number.isFinite(v));
  return finite.length > 0 ? finite.reduce((a, v) => a + v, 0) / finite.length : 0;
};

const heDate = (d: Date, opts: Intl.DateTimeFormatOptions) => d.toLocaleDateString("he-IL", opts);

/**
 * Buckets timestamped rows into one point per calendar day across
 * `[start, end]` inclusive, summing `valueOf(row)` per day and filling
 * days with no rows as 0 - so a trend line never silently skips over a
 * gap in the date sequence (which would otherwise draw a misleading
 * straight line across missing days, or compress the x-axis).
 */
export const bucketByDay = <T,>(rows: T[], getDate: (row: T) => string | Date, valueOf: (row: T) => number, start: Date, end: Date): TrendPoint[] => {
  const dayKeys: string[] = [];
  const buckets: Record<string, number> = {};
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  while (cursor <= last) {
    const key = cursor.toISOString().slice(0, 10);
    dayKeys.push(key);
    buckets[key] = 0;
    cursor.setDate(cursor.getDate() + 1);
  }

  rows.forEach((row) => {
    const raw = getDate(row);
    const d = raw instanceof Date ? raw : new Date(raw);
    if (Number.isNaN(d.getTime())) return; // skip rows with an unparsable date rather than crashing the chart
    const key = d.toISOString().slice(0, 10);
    if (buckets[key] !== undefined) buckets[key] += safeNumber(valueOf(row));
  });

  return dayKeys.map((key) => ({
    label: heDate(new Date(key), { day: "numeric", month: "short" }),
    value: Math.round(buckets[key]),
  }));
};

/**
 * Buckets timestamped rows into one point per calendar month across the
 * last `months` months (inclusive of the current month).
 */
export const bucketByMonth = <T,>(rows: T[], getDate: (row: T) => string | Date, valueOf: (row: T) => number, months: number, now: Date = new Date()): TrendPoint[] => {
  const monthKeys: string[] = [];
  const buckets: Record<string, number> = {};
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    monthKeys.push(key);
    buckets[key] = 0;
  }

  rows.forEach((row) => {
    const raw = getDate(row);
    const d = raw instanceof Date ? raw : new Date(raw);
    if (Number.isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (buckets[key] !== undefined) buckets[key] += safeNumber(valueOf(row));
  });

  return monthKeys.map((key) => {
    const [y, m] = key.split("-").map(Number);
    return { label: heDate(new Date(y, m, 1), { month: "short" }), value: Math.round(buckets[key]) };
  });
};

/**
 * Turns a chronologically-sorted list of sparse, irregularly-logged
 * measurements (e.g. body weight entered a few times a week) into trend
 * points, skipping rows where the target field is null rather than
 * plotting a false zero.
 */
export const sparsePoints = <T,>(rows: T[], getDate: (row: T) => string | Date, valueOf: (row: T) => number | null | undefined): TrendPoint[] =>
  rows
    .map((row) => {
      const raw = getDate(row);
      const d = raw instanceof Date ? raw : new Date(raw);
      const v = valueOf(row);
      if (Number.isNaN(d.getTime()) || v == null || !Number.isFinite(v)) return null;
      return { label: heDate(d, { day: "numeric", month: "short" }), value: v };
    })
    .filter((p): p is TrendPoint => p !== null);
