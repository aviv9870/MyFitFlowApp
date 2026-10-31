import { describe, it, expect } from "vitest";
import { compareExercises, type ExerciseInfo } from "@/domain/exerciseComparison";

// Real rows from the live exercises + pz_exercise_kinesiology tables.
const dbBench: ExerciseInfo = {
  name: "לחיצת חזה בשכיבה כנגד דמבלים",
  nameEn: "Dumbbell Bench Press",
  equipment: "Dumbbell",
  contributions: { chest: 1, triceps: 0.75, front_delts: 0.75 },
  pattern: "horizontal_push",
  isCompound: true,
  isUnilateral: false,
  jointStress: { elbow: 1, wrist: 1, shoulder: 2 },
};
const dbIncline: ExerciseInfo = {
  name: "לחיצת חזה בשיפוע חיובי כנגד דמבלים",
  nameEn: "Incline Dumbbell Bench Press",
  equipment: "Dumbbell",
  contributions: { chest: 1, triceps: 0.5, front_delts: 0.75 },
  pattern: "horizontal_push",
  isCompound: true,
  isUnilateral: false,
  jointStress: { elbow: 1, wrist: 1, shoulder: 2 },
};
const bbBench: ExerciseInfo = { ...dbBench, name: "לחיצת חזה בשכיבה כנגד מוט", nameEn: "Barbell Bench Press", equipment: "Barbell" };
const rope: ExerciseInfo = {
  name: "פשיטת מרפקים בפולי עליון עם חבל",
  nameEn: "Cable Triceps Pushdown (Rope)",
  equipment: "Cables",
  contributions: { triceps: 1 },
  pattern: "isolation",
  isCompound: false,
  isUnilateral: false,
  jointStress: { elbow: 3, shoulder: 1 },
};
const vbar: ExerciseInfo = { ...rope, name: "פשיטת מרפקים בפולי עליון עם מוט V", nameEn: "V-Bar Cable Triceps Pushdown" };
const fly: ExerciseInfo = {
  name: "פרפר במכונה",
  nameEn: "Pec Deck Fly",
  equipment: "Machine",
  contributions: { chest: 1, front_delts: 0.3 },
  pattern: "isolation",
  isCompound: false,
  isUnilateral: false,
  jointStress: { shoulder: 2, elbow: 1 },
};
const squat: ExerciseInfo = {
  name: "סקוואט עם מוט אחורי",
  nameEn: "Barbell Back Squat",
  equipment: "Barbell",
  contributions: { quads: 1, glutes: 0.75, hamstrings: 0.5 },
  pattern: "squat",
  isCompound: true,
  isUnilateral: false,
  jointStress: { knee: 3, hip: 2 },
};

const text = (c: ReturnType<typeof compareExercises>) => c.points.map((p) => `${p.title} ${p.text}`).join(" | ");

describe("compareExercises", () => {
  it("calls flat -> incline dumbbell press a variation and explains the angle and the muscle shift", () => {
    const c = compareExercises(dbBench, dbIncline);
    expect(c.relation).toBe("variation");
    expect(c.headline).toContain("שיפוע");
    const t = text(c);
    expect(t).toContain("לחלק העליון של החזה");
    // The only muscle that moves by 25 points is triceps: 75% -> 50%.
    expect(t).toContain("דגש נמוך יותר על יד אחורית (75% ← 50%)");
    // Same equipment, so no equipment point.
    expect(c.points.some((p) => p.icon === "fitness_center")).toBe(false);
  });

  it("explains rope vs V-bar as a pure handle change, even though the muscle data is identical", () => {
    const c = compareExercises(rope, vbar);
    expect(c.relation).toBe("variation");
    expect(c.headline).toContain("ידית");
    expect(c.points).toHaveLength(1);
    expect(c.points[0].text).toContain("מוט V");
  });

  it("warns that per-hand and total weights are not comparable when swapping barbell for dumbbells", () => {
    const c = compareExercises(bbBench, dbBench);
    expect(c.relation).toBe("variation");
    const equip = c.points.find((p) => p.icon === "fitness_center");
    expect(equip?.title).toBe("מוט ← משקולות יד");
    expect(equip?.text).toContain("אין להשוות מספרים ישירות");
  });

  it("does not add the per-hand warning when both exercises are logged the same way", () => {
    const smith: ExerciseInfo = { ...bbBench, nameEn: "Smith Machine Bench Press", equipment: "Machine" };
    const c = compareExercises(bbBench, smith);
    expect(c.points.find((p) => p.icon === "fitness_center")?.text).not.toContain("אין להשוות");
  });

  it("calls press -> fly an alternative for the same muscle and flags compound vs isolation", () => {
    const c = compareExercises(dbBench, fly);
    expect(c.relation).toBe("alternative");
    expect(c.points.some((p) => p.title === "תרגיל בידוד")).toBe(true);
    expect(c.points.some((p) => p.title === "תבנית תנועה" || p.title === "תרגיל בידוד")).toBe(true);
  });

  it("calls chest -> legs a different exercise and names both muscle groups", () => {
    const c = compareExercises(dbBench, squat);
    expect(c.relation).toBe("different");
    expect(c.headline).toContain("ארבע־ראשי");
    expect(c.headline).toContain("חזה");
    expect(c.points.some((p) => p.title === "שריר עיקרי")).toBe(true);
  });

  it("explains a grip change by movement type", () => {
    const row = (nameEn: string): ExerciseInfo => ({
      name: nameEn, nameEn, equipment: "Cables", pattern: "vertical_pull",
      contributions: { lats: 1, biceps: 0.5 }, isCompound: true, isUnilateral: false,
    });
    const c = compareExercises(row("Lat Pulldown"), row("Close-Grip Lat Pulldown"));
    expect(c.points.find((p) => p.title === "אחיזה")?.text).toContain("יד הקדמית");
  });

  it("still compares using names and equipment when kinesiology data is missing", () => {
    const strip = (e: ExerciseInfo): ExerciseInfo => ({ ...e, contributions: undefined, pattern: undefined, isCompound: undefined, jointStress: undefined });
    const c = compareExercises(strip(bbBench), strip(dbIncline));
    expect(c.relation).toBe("variation");
    expect(text(c)).toContain("שיפוע חיובי");
    expect(text(c)).toContain("משקולות יד");
  });

  it("says so when two exercises are effectively the same", () => {
    const c = compareExercises(dbBench, { ...dbBench, name: "עותק", nameEn: "Dumbbell Bench Press" });
    expect(c.points[0].title).toBe("אין הבדל מהותי");
  });
});
