import { describe, it, expect } from "vitest";
import { analyzeTraining, type AnalysisSet } from "@/domain/trainingInsights";
import { PLATEAU_SESSIONS, TRACKED_MUSCLES, WEEKLY_SETS } from "@/domain/trainingKnowledge";

const NOW = new Date("2026-09-29T12:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();

const set = (name: string, weight: number, reps: number, d: number): AnalysisSet => ({
  exercise_name: name,
  weight,
  reps,
  created_at: daysAgo(d),
});

// One exercise per tracked muscle, so a test can start from a covered program
// and introduce exactly one problem - otherwise every untouched muscle counts
// as neglected and that rule (correctly) wins every recommendation.
const COVERAGE_EXERCISE_MUSCLE: Record<string, string> = {
  "פרפר": "חזה",
  "פולי עליון": "גב",
  "לחיצת רגליים": "רגליים",
  "לחיצת כתפיים": "כתפיים",
  "כפיפת מרפקים": "יד קדמית",
  "פשיטת מרפקים": "יד אחורית",
  "כפיפות בטן": "בטן",
};
// Kept out of `coverage` so a progression test owns every session of them.
const EXERCISE_MUSCLE: Record<string, string> = {
  ...COVERAGE_EXERCISE_MUSCLE,
  "לחיצת חזה": "חזה",
  "סקוואט": "רגליים",
};
const muscleOf = (name: string) => EXERCISE_MUSCLE[name] ?? "אחר";
const coverage = (d = 2) => Object.keys(COVERAGE_EXERCISE_MUSCLE).map((name) => set(name, 40, 10, d));

const healthyWeekly = Object.fromEntries(TRACKED_MUSCLES.map((m) => [m, 12]));
// 10 sessions over the 30-day window = 2.3 per week, above the frequency target.
const healthySessions = Array.from({ length: 10 }, (_, i) => daysAgo(i * 3 + 1));

const run = (sets: AnalysisSet[], over: Partial<Parameters<typeof analyzeTraining>[0]> = {}) =>
  analyzeTraining({
    sets,
    sessionDates: healthySessions,
    weeklySets: healthyWeekly,
    muscleOf,
    now: NOW,
    ...over,
  });

describe("analyzeTraining", () => {
  it("asks for a logged workout when there is nothing in the window", () => {
    const result = run([set("לחיצת חזה", 60, 10, 90)]);
    expect(result.training_qualities).toEqual([]);
    expect(result.insights[0]).toContain("אין סטים מתועדים");
    expect(result.recommendation).toContain("תתעד");
  });

  it("scores each rep range by the share of sets that landed in it", () => {
    const sets = [
      ...Array.from({ length: 8 }, (_, i) => set("לחיצת חזה", 60, 10, i + 1)),
      ...Array.from({ length: 2 }, (_, i) => set("סקוואט", 100, 3, i + 1)),
    ];
    const qualities = run(sets).training_qualities;
    expect(qualities.find((q) => q.quality === "היפרטרופיה")?.verdict).toBe("עבודה טובה");
    expect(qualities.find((q) => q.quality === "היפרטרופיה")?.detail).toContain("80%");
    expect(qualities.find((q) => q.quality === "כוח מרבי")?.verdict).toBe("חלקית");
    expect(qualities.find((q) => q.quality === "סבולת שריר")?.verdict).toBe("כמעט ולא");
  });

  it("flags a muscle under the weekly minimum and says how much to add", () => {
    const result = run(coverage(), { weeklySets: { ...healthyWeekly, "יד קדמית": 3 } });
    expect(result.insights.some((i) => i.includes("יד קדמית 3 סטים"))).toBe(true);
    expect(result.insights.some((i) => i.includes(`מתחת ל-${WEEKLY_SETS.mev}`))).toBe(true);
    expect(result.recommendation).toContain("יד קדמית");
  });

  it("flags a muscle over the recommended top", () => {
    const result = run(coverage(), { weeklySets: { ...healthyWeekly, "חזה": 30 } });
    expect(result.insights.some((i) => i.includes("חזה 30 סטים") && i.includes(String(WEEKLY_SETS.max)))).toBe(true);
    expect(result.recommendation).toContain("תוריד סט");
  });

  it("names muscles with no sets at all, and puts them first in the recommendation", () => {
    // Everything logged except back, while biceps is merely under the minimum.
    const sets = coverage().filter((s) => muscleOf(s.exercise_name) !== "גב");
    const result = run(sets, { weeklySets: { ...healthyWeekly, "יד קדמית": 3 } });
    const neglected = result.insights.find((i) => i.includes("לא קיבלו אף סט"));
    expect(neglected).toContain("גב");
    expect(result.recommendation).toContain("גב");
  });

  it("does not report an untrained muscle as merely under the minimum", () => {
    // Back gets no direct work, only a fraction of a set as a synergist.
    const sets = coverage().filter((s) => muscleOf(s.exercise_name) !== "גב");
    const result = run(sets, { weeklySets: { ...healthyWeekly, "גב": 0.5 } });
    expect(result.insights.filter((i) => i.includes("גב")).length).toBe(1);
    expect(result.insights.some((i) => i.includes("גב") && i.includes("לא קיבלו אף סט"))).toBe(true);
  });

  it("calls an exercise stuck after three sessions with no estimated-1RM gain", () => {
    const sets = [
      ...coverage(),
      ...Array.from({ length: PLATEAU_SESSIONS }, (_, i) => set("לחיצת חזה", 60, 10, (i + 1) * 3)),
    ];
    const result = run(sets);
    expect(result.insights.some((i) => i.includes("לחיצת חזה (60ק״ג × 10)"))).toBe(true);
    expect(result.recommendation).toContain("חזרה אחת נוספת");
  });

  it("reports an exercise that is moving up", () => {
    const sets = [...coverage(), set("סקוואט", 100, 8, 9), set("סקוואט", 105, 8, 5), set("סקוואט", 110, 8, 1)];
    const line = run(sets).insights.find((i) => i.includes("1RM המשוער עלה"));
    expect(line).toContain("סקוואט");
    expect(line).toContain("+10.0%");
  });

  it("counts workouts per week and says when it is under twice a week", () => {
    const result = run(coverage(), { sessionDates: [daysAgo(2), daysAgo(9), daysAgo(16)] });
    expect(result.insights.some((i) => i.includes("3 אימונים ב-30 ימים") && i.includes("0.7 בשבוע"))).toBe(true);
    expect(result.recommendation).toContain("אימון שבועי אחד");
  });

  it("addresses a female trainee in the feminine", () => {
    const sets = [
      ...coverage(),
      ...Array.from({ length: PLATEAU_SESSIONS }, (_, i) => set("לחיצת חזה", 60, 10, (i + 1) * 3)),
    ];
    expect(run(sets, { gender: "female" }).recommendation).toContain("תנסי");
    expect(run(sets, { gender: "male" }).recommendation).toContain("תנסה");
  });

  it("says everything is on track when nothing needs fixing", () => {
    const sets = [
      ...coverage(),
      set("לחיצת חזה", 60, 10, 9),
      set("לחיצת חזה", 62.5, 10, 5),
      set("לחיצת חזה", 65, 10, 1),
    ];
    expect(run(sets).recommendation).toContain("בטווח הנכון");
  });
});
