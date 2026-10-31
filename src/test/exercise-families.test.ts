import { describe, it, expect } from "vitest";
import { buildFamilyIndex, variantKey, NO_FAMILIES, type LibraryExercise } from "@/domain/exerciseFamilies";
import { findPersonalRecords, type PreviousSet } from "@/domain/personalRecords";

// Real rows from the live exercises table (Hebrew name, English name, equipment).
const lib = (name: string, name_en: string, equipment: string): LibraryExercise => ({ name, name_en, equipment });
const LIBRARY: LibraryExercise[] = [
  lib("לחיצת חזה בשכיבה כנגד דמבלים", "Dumbbell Bench Press", "Dumbbell"),
  lib("לחיצת חזה בשיפוע חיובי כנגד דמבלים", "Incline Dumbbell Bench Press", "Dumbbell"),
  lib("לחיצת חזה כנגד דמבלים בשיפוע שלילי", "Decline Dumbbell Bench Press", "Dumbbell"),
  lib("לחיצת חזה חד-צדדית כנגד דמבל בשכיבה", "Single-Arm Dumbbell Bench Press", "Dumbbell"),
  lib("לחיצת חזה בשכיבה כנגד מוט", "Barbell Bench Press", "Barbell"),
  lib("פשיטת מרפקים בפולי עליון עם חבל", "Cable Triceps Pushdown (Rope)", "Cables"),
  lib("פשיטת מרפקים בפולי עליון עם מוט ישר", "Cable Triceps Pushdown (Straight Bar)", "Cables"),
  lib("פשיטת מרפקים בפולי עליון עם מוט V", "V-Bar Cable Triceps Pushdown", "Cables"),
  lib("פשיטת מרפקים בפולי עליון באחיזה הפוכה (סופינציה)", "Reverse-Grip Cable Triceps Pushdown", "Cables"),
  lib("פשיטת מרפק חד-צדדית בפולי עליון ללא ידית", "Single-Arm Cable Triceps Pushdown", "Cables"),
  lib("פולי עליון באחיזה רחבה לפנים", "Lat Pulldown", "Cables"),
  lib("פולי עליון באחיזה צרה", "Close Grip Lat Pulldown", "Cables"),
  lib("לחיצת חזה במכונת סמית", "Smith Machine Bench Press", "Machine"),
  lib("לחיצת חזה במכונת האמר סטרנג'ת שטוחה", "Flat Hammer Strength Chest Press", "Machine"),
  lib("סקוואט עם מוט אחורי", "Barbell Back Squat", "Barbell"),
];
const N = Object.fromEntries(LIBRARY.map((e) => [e.name_en, e.name]));
const index = buildFamilyIndex(LIBRARY);

describe("exercise families", () => {
  it("groups dumbbell presses that differ only in bench angle", () => {
    expect(index.siblingsOf(N["Dumbbell Bench Press"]).sort()).toEqual(
      [N["Incline Dumbbell Bench Press"], N["Decline Dumbbell Bench Press"]].sort(),
    );
  });

  it("groups cable pushdowns that differ only in handle: rope, straight bar, V-bar", () => {
    expect(index.siblingsOf(N["V-Bar Cable Triceps Pushdown"]).sort()).toEqual(
      [N["Cable Triceps Pushdown (Rope)"], N["Cable Triceps Pushdown (Straight Bar)"]].sort(),
    );
  });

  it("groups lat pulldowns by grip width", () => {
    expect(index.siblingsOf(N["Lat Pulldown"])).toEqual([N["Close Grip Lat Pulldown"]]);
  });

  it("keeps barbell and dumbbell apart: their logged weights are not comparable", () => {
    expect(index.siblingsOf(N["Barbell Bench Press"])).toEqual([]);
    expect(variantKey(LIBRARY[0])).not.toBe(variantKey(LIBRARY[4]));
  });

  it("keeps a smith machine and a plate-loaded machine press apart from free weights", () => {
    expect(index.siblingsOf(N["Smith Machine Bench Press"])).toEqual([]);
    expect(index.siblingsOf(N["Flat Hammer Strength Chest Press"])).toEqual([]);
  });

  it("does not merge a different movement: reverse grip and single-arm are their own lifts", () => {
    expect(index.siblingsOf(N["Reverse-Grip Cable Triceps Pushdown"])).toEqual([]);
    expect(index.siblingsOf(N["Single-Arm Cable Triceps Pushdown"])).toEqual([]);
    expect(index.siblingsOf(N["Single-Arm Dumbbell Bench Press"])).toEqual([]);
  });

  it("knows nothing about an exercise that is not in the library", () => {
    expect(index.siblingsOf("תרגיל שהמשתמש המציא")).toEqual([]);
    expect(NO_FAMILIES.siblingsOf(N["Dumbbell Bench Press"])).toEqual([]);
  });
});

describe("findPersonalRecords", () => {
  const rope = N["Cable Triceps Pushdown (Rope)"];
  const vbar = N["V-Bar Cable Triceps Pushdown"];
  const flat = N["Dumbbell Bench Press"];
  const incline = N["Incline Dumbbell Bench Press"];
  const prev = (exercise_name: string, weight: number, reps: number, session_id: string): PreviousSet => ({ exercise_name, weight, reps, session_id });

  it("first ever session of an exercise is a 'first'", () => {
    const r = findPersonalRecords([{ exercise_name: rope, weight: 20, reps: 12 }], [], index.siblingsOf);
    expect(r).toEqual([{ exercise: rope, type: "weight", oldValue: 0, newValue: 20, isFirst: true }]);
  });

  it("an exercise with its own history is judged against that history, as before", () => {
    const r = findPersonalRecords(
      [{ exercise_name: rope, weight: 30, reps: 10 }],
      [prev(rope, 25, 10, "s1")],
      index.siblingsOf,
    );
    expect(r.find((x) => x.type === "weight")).toMatchObject({ oldValue: 25, newValue: 30, isFirst: false });
    expect(r.every((x) => x.baseline === undefined)).toBe(true);
  });

  it("first time on the V-bar after months on the rope: beating the rope numbers is a record, not just a 'first'", () => {
    const r = findPersonalRecords(
      [{ exercise_name: vbar, weight: 30, reps: 12 }],
      [prev(rope, 25, 12, "s1"), prev(rope, 25, 10, "s1")],
      index.siblingsOf,
    );
    const weight = r.find((x) => x.type === "weight");
    expect(weight).toMatchObject({ exercise: vbar, oldValue: 25, newValue: 30, isFirst: false, baseline: rope });
    expect(r.some((x) => x.isFirst)).toBe(false);
  });

  it("first time on the V-bar but lighter than the rope: still a plain 'first'", () => {
    const r = findPersonalRecords(
      [{ exercise_name: vbar, weight: 20, reps: 10 }],
      [prev(rope, 40, 12, "s1")],
      index.siblingsOf,
    );
    expect(r).toEqual([{ exercise: vbar, type: "weight", oldValue: 0, newValue: 20, isFirst: true }]);
  });

  it("incline progress is not suppressed by a heavier flat press once incline has its own history", () => {
    const r = findPersonalRecords(
      [{ exercise_name: incline, weight: 24, reps: 10 }],
      [prev(incline, 22, 10, "s2"), prev(flat, 34, 10, "s1")],
      index.siblingsOf,
    );
    expect(r.find((x) => x.type === "weight")).toMatchObject({ oldValue: 22, newValue: 24, isFirst: false });
  });

  it("does not borrow history from a different kind of equipment", () => {
    const r = findPersonalRecords(
      [{ exercise_name: flat, weight: 30, reps: 10 }],
      [prev(N["Barbell Bench Press"], 80, 8, "s1")],
      index.siblingsOf,
    );
    expect(r).toEqual([{ exercise: flat, type: "weight", oldValue: 0, newValue: 30, isFirst: true }]);
  });

  it("counts a session's volume per exercise, not summed across the variations done in it", () => {
    // Same session: 3x10 flat at 30 (900) and 3x10 incline at 20 (600). Summed
    // they'd be 1500; per exercise the best is 900, so 1000 beats it.
    const r = findPersonalRecords(
      [{ exercise_name: N["Decline Dumbbell Bench Press"], weight: 33.4, reps: 30 }],
      [prev(flat, 30, 10, "s1"), prev(flat, 30, 10, "s1"), prev(flat, 30, 10, "s1"), prev(incline, 20, 10, "s1"), prev(incline, 20, 10, "s1"), prev(incline, 20, 10, "s1")],
      index.siblingsOf,
    );
    const volume = r.find((x) => x.type === "volume");
    expect(volume).toMatchObject({ oldValue: 900, newValue: 1002 });
  });
});
