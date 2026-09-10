import { describe, it, expect } from "vitest";
import {
  PZ_MUSCLE_REGION,
  regionsForExercise,
  regionsFromContributions,
  type ExerciseRegions,
} from "@/lib/exerciseRegions";
import { REGION_GROUPS } from "@/components/3d/regions";
import { tallyRegionWeek } from "@/lib/muscleGroups";

// pz_muscles.code values in the live database (2026-09-11).
const PZ_MUSCLE_CODES = [
  "chest", "front_delts", "side_delts", "rear_delts", "triceps", "lats", "upper_back",
  "traps", "biceps", "forearms", "quads", "hamstrings", "glutes", "adductors", "calves",
  "abs", "obliques", "lower_back", "hip_flexors", "neck",
];

describe("PZ_MUSCLE_REGION", () => {
  it("maps every pz muscle to a model region or to nothing", () => {
    expect(Object.keys(PZ_MUSCLE_REGION).sort()).toEqual([...PZ_MUSCLE_CODES].sort());
    for (const region of Object.values(PZ_MUSCLE_REGION)) {
      if (region !== null) expect(REGION_GROUPS).toContain(region);
    }
  });

  it("reaches every region of the model", () => {
    const reached = new Set(Object.values(PZ_MUSCLE_REGION));
    for (const region of REGION_GROUPS) expect(reached.has(region)).toBe(true);
  });
});

describe("regionsFromContributions", () => {
  it("keeps each contribution, with the largest delt head for the shared region", () => {
    expect(regionsFromContributions({ chest: 1, triceps: 0.75, front_delts: 0.75 })).toEqual({
      shares: { Chest: 1, Triceps: 0.75, Deltoid: 0.75 },
      primaryOnModel: true,
    });
    expect(regionsFromContributions({ side_delts: 1, rear_delts: 0.5, traps: 0.3 }).shares).toEqual({
      Deltoid: 1,
    });
  });

  it("flags an exercise whose main muscle is not on the model but keeps its other regions", () => {
    expect(regionsFromContributions({ traps: 1, forearms: 0.3 })).toEqual({
      shares: { Forearm: 0.3 },
      primaryOnModel: false,
    });
  });

  it("ignores non-positive values and treats unknown muscle codes as off the model", () => {
    expect(regionsFromContributions({ serratus: 1, chest: 0.5, abs: 0 })).toEqual({
      shares: { Chest: 0.5 },
      primaryOnModel: false,
    });
  });
});

describe("regionsForExercise", () => {
  const byId = new Map([["ex-1", { hamstrings: 1, calves: 0.25 }]]);

  it("uses the exercise's kinesiology row first", () => {
    expect(regionsForExercise(byId, "ex-1", "רגליים")).toEqual({
      shares: { Hamstring: 1, Calf: 0.25 },
      primaryOnModel: true,
    });
  });

  it("falls back to a single-region muscle group, else nothing", () => {
    expect(regionsForExercise(byId, "not-seeded", "חזה")).toEqual({
      shares: { Chest: 1 },
      primaryOnModel: true,
    });
    expect(regionsForExercise(byId, undefined, "רגליים")).toBeNull();
  });
});

describe("tallyRegionWeek", () => {
  const table: Record<string, ExerciseRegions> = {
    "לחיצת רגליים במכונה": { shares: { Quad: 1, Glute: 0.5 }, primaryOnModel: true },
    "שראגס כנגד מוט מלפנים": { shares: { Forearm: 0.3 }, primaryOnModel: false },
  };
  const regionsOf = (name: string) => table[name] ?? null;
  const weekStart = new Date("2026-09-06T00:00:00");

  it("credits each region its share of this week's sets, reps and volume", () => {
    const { regions, offModelSets } = tallyRegionWeek(
      [
        { exercise_name: "לחיצת רגליים במכונה", created_at: "2026-09-08T10:00:00", weight: 100, reps: 10 },
        { exercise_name: "לחיצת רגליים במכונה", created_at: "2026-09-01T10:00:00", weight: 100, reps: 10 },
      ],
      regionsOf,
      weekStart,
    );
    expect(regions.Quad).toEqual({ sets: 1, reps: 10, volumeKg: 1000 });
    expect(regions.Glute).toEqual({ sets: 0.5, reps: 5, volumeKg: 500 });
    expect(offModelSets).toBe(0);
  });

  it("counts sets whose main muscle is off the model while still crediting their other regions", () => {
    const { regions, offModelSets } = tallyRegionWeek(
      [
        { exercise_name: "שראגס כנגד מוט מלפנים", created_at: "2026-09-08T10:00:00", weight: 60, reps: 10 },
        { exercise_name: "תרגיל חדש", created_at: "2026-09-08T10:00:00", weight: 0, reps: 10 },
      ],
      regionsOf,
      weekStart,
    );
    expect(offModelSets).toBe(2);
    expect(regions.Forearm?.sets).toBeCloseTo(0.3);
    expect(regions.Forearm?.reps).toBeCloseTo(3);
    expect(regions.Forearm?.volumeKg).toBeCloseTo(180);
  });
});
