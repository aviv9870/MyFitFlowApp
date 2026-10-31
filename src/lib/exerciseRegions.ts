import type { RegionGroup } from "@/components/3d/regions";
import { canonicalMuscleGroup } from "@/lib/muscleGroups";

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

// An exercise without a kinesiology row - one the trainee added after the table
// was seeded, or an approved one the seed missed - gets the same per-group
// defaults the table itself was seeded with for exercises its name rules
// didn't recognise. Crediting only the primary muscle (as this used to) meant
// a machine chest press never counted its triceps and front-delt work.
const GROUP_DEFAULTS: Record<string, Record<string, number>> = {
  "חזה": { chest: 1, front_delts: 0.5, triceps: 0.5 },
  "גב": { lats: 1, upper_back: 0.5, biceps: 0.5 },
  "כתפיים": { front_delts: 1, side_delts: 0.5, triceps: 0.5 },
  "רגליים": { quads: 1, glutes: 0.5, hamstrings: 0.5 },
  "בטן": { abs: 1, obliques: 0.5 },
  "יד קדמית": { biceps: 1, forearms: 0.3 },
  "יד אחורית": { triceps: 1 },
};

export function regionsForExercise(
  contributionsById: Map<string, Record<string, number>>,
  exerciseId: string | undefined,
  muscleGroup: string,
): ExerciseRegions | null {
  const contributions = exerciseId ? contributionsById.get(exerciseId) : undefined;
  if (contributions) return regionsFromContributions(contributions);
  const defaults = GROUP_DEFAULTS[canonicalMuscleGroup(muscleGroup)];
  return defaults ? regionsFromContributions(defaults) : null;
}
