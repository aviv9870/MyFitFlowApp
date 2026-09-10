import type { RegionGroup } from "@/components/3d/regions";

export type RegionShares = Partial<Record<RegionGroup, number>>;

export interface ExerciseRegions {
  shares: RegionShares;
  /** false when the exercise's main muscle has no region on the 3D model (e.g. shrugs → traps). */
  primaryOnModel: boolean;
}

// Which muscles an exercise loads comes from the live table pz_exercise_kinesiology
// (muscle_contributions: pz_muscles.code -> 0..1). This maps those codes onto the
// model's 12 regions; null = the model has no region for that muscle.
export const PZ_MUSCLE_REGION: Record<string, RegionGroup | null> = {
  chest: "Chest",
  front_delts: "Deltoid",
  side_delts: "Deltoid",
  rear_delts: "Deltoid",
  triceps: "Triceps",
  lats: "Lat",
  upper_back: null,
  traps: null,
  biceps: "Biceps",
  forearms: "Forearm",
  quads: "Quad",
  hamstrings: "Hamstring",
  glutes: "Glute",
  adductors: null,
  calves: "Calf",
  abs: "Abs",
  obliques: "Oblique",
  lower_back: null,
  hip_flexors: null,
  neck: null,
};

// The three delt heads share one region, and a set counts at most once per
// region, so a region takes its largest contribution rather than the sum.
export function regionsFromContributions(contributions: Record<string, number>): ExerciseRegions {
  const shares: RegionShares = {};
  let top = 0;
  let primaryOnModel = false;
  for (const [code, raw] of Object.entries(contributions)) {
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) continue;
    const region = PZ_MUSCLE_REGION[code] ?? null;
    if (region) shares[region] = Math.max(shares[region] ?? 0, value);
    if (value > top) {
      top = value;
      primaryOnModel = region !== null;
    } else if (value === top && region) {
      primaryOnModel = true;
    }
  }
  return { shares, primaryOnModel };
}

// An exercise without a kinesiology row (e.g. approved after the table was
// seeded) falls back to its muscle_group when that group is a single region.
const GROUP_FALLBACK: Record<string, RegionGroup> = {
  "חזה": "Chest",
  "גב": "Lat",
  "כתפיים": "Deltoid",
  "יד קדמית": "Biceps",
  "יד אחורית": "Triceps",
};

export function regionsForExercise(
  contributionsById: Map<string, Record<string, number>>,
  exerciseId: string | undefined,
  muscleGroup: string,
): ExerciseRegions | null {
  const contributions = exerciseId ? contributionsById.get(exerciseId) : undefined;
  if (contributions) return regionsFromContributions(contributions);
  const region = GROUP_FALLBACK[muscleGroup];
  return region ? { shares: { [region]: 1 }, primaryOnModel: true } : null;
}
