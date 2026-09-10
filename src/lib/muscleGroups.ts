import { safeNumber } from "@/lib/chartData";
import type { RegionGroup } from "@/components/3d/regions";

// Shared muscle-group naming/coloring so Analytics and CoachDashboard's
// distribution charts render identically instead of drifting apart (the
// coach-side copy used to have its own map with a leftover yellow and no
// English/Hebrew alias handling).

// The exercises table has muscle_group values seeded in both English and
// Hebrew for the same muscle (e.g. "Shoulders" and "כתפיים" both exist) -
// normalize everything to a single canonical Hebrew name so the same
// muscle doesn't get split into two separate bars in a distribution chart.
const MUSCLE_GROUP_ALIASES: Record<string, string> = {
  Back: "גב",
  Biceps: "יד קדמית",
  Chest: "חזה",
  Core: "בטן",
  Legs: "רגליים",
  Shoulders: "כתפיים",
  Triceps: "יד אחורית",
};

export const canonicalMuscleGroup = (raw: string) => MUSCLE_GROUP_ALIASES[raw] ?? raw;

// Distinct, fixed color per muscle (not a rank-based intensity scale) so
// each muscle keeps a consistent, easily-distinguishable color regardless
// of its current rank in the list. No yellow, by request.
const MUSCLE_COLORS: Record<string, string> = {
  "חזה": "#FF6B6B",
  "גב": "#4ECDC4",
  "כתפיים": "#5B9EE8",
  "רגליים": "#8FD08A",
  "יד קדמית": "#C58AF2",
  "יד אחורית": "#F2789A",
  "בטן": "#FF9F5B",
  "אחר": "oklch(var(--muted-foreground))",
};

export const muscleColor = (name: string) => MUSCLE_COLORS[name] ?? "oklch(var(--primary))";

// Compound exercises also load secondary muscles besides their primary
// muscle_group - credit those as partial ("indirect") sets so a
// distribution chart reflects real training load, not just the primary
// target muscle.
export const SYNERGIST_MAP: Record<string, { muscle: string; factor: number }[]> = {
  "חזה": [{ muscle: "יד אחורית", factor: 0.5 }],
  "גב": [{ muscle: "יד קדמית", factor: 0.5 }],
  "כתפיים": [{ muscle: "יד אחורית", factor: 0.5 }],
  "רגליים": [{ muscle: "בטן", factor: 0.25 }],
};

// Indirect (synergist) credit can produce values like 3.5 - round to the
// nearest half-set and drop the trailing .0 for whole numbers.
export const formatSets = (n: number) => {
  const rounded = Math.round(n * 2) / 2;
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
};

export interface MuscleWork {
  sets: number;
  reps: number;
  volumeKg: number;
}

interface TalliedSetLog {
  exercise_name: string;
  created_at: string;
  weight?: number | null;
  reps?: number | null;
}

// One pass over set logs: set credit per group for the whole window (the
// distribution bars) and this week's sets/reps/volume (the bars' detail and
// the 3D load map), both with the same synergist credit so they never disagree.
export const tallyMuscleWork = (
  logs: TalliedSetLog[],
  groupOf: (exerciseName: string) => string,
  weekStart: Date,
) => {
  const sets: Record<string, number> = {};
  const weekly: Record<string, MuscleWork> = {};
  for (const log of logs) {
    const group = groupOf(log.exercise_name);
    const reps = safeNumber(log.reps);
    const volume = safeNumber(log.weight) * reps;
    const thisWeek = new Date(log.created_at) >= weekStart;
    const credit = (muscle: string, factor: number) => {
      sets[muscle] = (sets[muscle] ?? 0) + factor;
      if (!thisWeek) return;
      if (!weekly[muscle]) weekly[muscle] = { sets: 0, reps: 0, volumeKg: 0 };
      weekly[muscle].sets += factor;
      weekly[muscle].reps += reps * factor;
      weekly[muscle].volumeKg += volume * factor;
    };
    credit(group, 1);
    SYNERGIST_MAP[group]?.forEach(({ muscle, factor }) => credit(muscle, factor));
  }
  return { sets, weekly };
};

// This week's work per 3D-model region. regionsOf gives an exercise's region
// shares (lib/exerciseRegions). A set whose main muscle has no region on the
// model (e.g. shrugs -> traps) still credits its other regions, and is counted
// in offModelSets so it stays visible instead of silently dropping.
export const tallyRegionWeek = (
  logs: TalliedSetLog[],
  regionsOf: (
    exerciseName: string,
  ) => { shares: Partial<Record<RegionGroup, number>>; primaryOnModel: boolean } | null,
  weekStart: Date,
) => {
  const regions: Partial<Record<RegionGroup, MuscleWork>> = {};
  let offModelSets = 0;
  for (const log of logs) {
    if (new Date(log.created_at) < weekStart) continue;
    const mapped = regionsOf(log.exercise_name);
    if (!mapped || !mapped.primaryOnModel) offModelSets += 1;
    const shares = Object.entries(mapped?.shares ?? {}) as [RegionGroup, number][];
    const reps = safeNumber(log.reps);
    const volume = safeNumber(log.weight) * reps;
    for (const [region, share] of shares) {
      if (!regions[region]) regions[region] = { sets: 0, reps: 0, volumeKg: 0 };
      regions[region].sets += share;
      regions[region].reps += reps * share;
      regions[region].volumeKg += volume * share;
    }
  }
  return { regions, offModelSets };
};
