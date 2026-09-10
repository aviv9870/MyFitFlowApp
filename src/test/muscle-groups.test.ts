import { describe, it, expect } from "vitest";
import { tallyMuscleWork } from "@/lib/muscleGroups";

const weekStart = new Date("2026-09-06T00:00:00");
const exerciseGroups: Record<string, string> = {
  "לחיצת חזה בשכיבה כנגד מוט": "חזה",
  "סקוואט כנגד מוט": "רגליים",
};
const groupOf = (name: string) => exerciseGroups[name] ?? "אחר";
const log = (exercise_name: string, created_at: string, weight: number, reps: number) => ({
  exercise_name,
  created_at,
  weight,
  reps,
});

describe("tallyMuscleWork", () => {
  it("credits the primary group and its synergists with sets, reps and volume this week", () => {
    const { sets, weekly } = tallyMuscleWork(
      [log("לחיצת חזה בשכיבה כנגד מוט", "2026-09-08T10:00:00", 60, 10)],
      groupOf,
      weekStart,
    );
    expect(sets["חזה"]).toBe(1);
    expect(sets["יד אחורית"]).toBe(0.5);
    expect(weekly["חזה"]).toEqual({ sets: 1, reps: 10, volumeKg: 600 });
    expect(weekly["יד אחורית"]).toEqual({ sets: 0.5, reps: 5, volumeKg: 300 });
  });

  it("counts sets from before the week in the totals but not in this week", () => {
    const { sets, weekly } = tallyMuscleWork(
      [log("סקוואט כנגד מוט", "2026-09-05T23:59:00", 100, 5)],
      groupOf,
      weekStart,
    );
    expect(sets["רגליים"]).toBe(1);
    expect(sets["בטן"]).toBe(0.25);
    expect(weekly["רגליים"]).toBeUndefined();
  });

  it("files unknown exercises under 'אחר' and tolerates missing weight or reps", () => {
    const { weekly } = tallyMuscleWork(
      [{ exercise_name: "תרגיל חדש", created_at: "2026-09-07T08:00:00", weight: null, reps: null }],
      groupOf,
      weekStart,
    );
    expect(weekly["אחר"]).toEqual({ sets: 1, reps: 0, volumeKg: 0 });
  });
});
