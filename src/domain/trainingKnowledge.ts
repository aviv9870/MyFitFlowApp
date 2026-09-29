// The app's training knowledge, in one place: the numbers a coach would judge
// a trainee's week against. It replaces the LLM for the analytics screen -
// these rules are stable, instant, free, and give the same answer twice, which
// an LLM behind a paid provider chain does not.
//
// Every threshold here is a coaching convention, not a measurement of that
// trainee's physiology. Wording in trainingInsights.ts must stay descriptive
// ("מתחת לטווח המומלץ") rather than medical.

/** Rep bands and what training quality each one mainly develops. */
export const REP_BANDS = [
  { key: "strength", label: "כוח מרבי", min: 1, max: 5 },
  { key: "hypertrophy", label: "היפרטרופיה", min: 6, max: 12 },
  { key: "endurance", label: "סבולת שריר", min: 13, max: 100 },
] as const;

export type RepBandKey = (typeof REP_BANDS)[number]["key"];

export const bandOf = (reps: number): RepBandKey | null =>
  REP_BANDS.find((b) => reps >= b.min && reps <= b.max)?.key ?? null;

/** Share of sets in a band that counts as real work on that quality. */
export const BAND_VERDICTS = [
  { minShare: 0.4, verdict: "עבודה טובה" },
  { minShare: 0.15, verdict: "חלקית" },
  { minShare: 0, verdict: "כמעט ולא" },
] as const;

export const verdictForShare = (share: number) =>
  BAND_VERDICTS.find((v) => share >= v.minShare)?.verdict ?? "כמעט ולא";

/**
 * Weekly sets per muscle group. Same range the 3D load map judges against
 * (regions.ts DEFAULT_WEEKLY_SET_RANGE), so the two screens can't disagree.
 */
export const WEEKLY_SETS = {
  /** Below this, a muscle is getting less than a productive week's work. */
  mev: 8,
  /** Top of the recommended range; above it is more than usually needed. */
  max: 25,
} as const;

/** Muscle groups the app expects a balanced program to cover. */
export const TRACKED_MUSCLES = ["חזה", "גב", "רגליים", "כתפיים", "יד קדמית", "יד אחורית", "בטן"] as const;

/** Sessions per week that a muscle is usually trained in. */
export const WEEKLY_FREQUENCY_TARGET = 2;

/** How many sessions of one exercise with no estimated-1RM gain reads as stuck. */
export const PLATEAU_SESSIONS = 3;

/** Gain over the compared span that counts as progress rather than noise. */
export const PROGRESS_THRESHOLD_PCT = 2;

/** A muscle untouched for this many days is called out as neglected. */
export const NEGLECTED_DAYS = 14;

/** Analysis window for rep-range and progression, in days. */
export const ANALYSIS_DAYS = 30;
