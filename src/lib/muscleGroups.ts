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
