// Local-only fake data for the DEV_MODE mock trainee, so the coach dashboard has
// something realistic to show without writing to the real Supabase tables (which
// are UUID/RLS-protected and don't have a real row for this trainee anyway).
import { saveBasePlan } from "@/services/nutritionLocal";
import type { PlanMeal } from "@/domain/nutrition-calculations";

export const MOCK_TRAINEE_ID = "mock-trainee-1";

export interface MockSession {
  id: string;
  plan_name: string;
  duration_seconds: number;
  completed_at: string;
}

export interface MockSetLog {
  session_id: string;
  exercise_name: string;
  weight: number;
  reps: number;
  created_at: string;
}

export interface MockMeasurement {
  id: string;
  measured_at: string;
  weight: number | null;
  upper_belly: number | null;
  lower_belly: number | null;
  right_arm: number | null;
  left_arm: number | null;
  shoulder_width: number | null;
  right_thigh: number | null;
  left_thigh: number | null;
  notes: string | null;
}

export interface MockWeightLog {
  weight: number;
  logged_at: string;
}

const sessionsKey = (traineeId: string) => `myfitflow:mock:sessions:${traineeId}`;
const setLogsKey = (traineeId: string) => `myfitflow:mock:setlogs:${traineeId}`;
const measurementsKey = (traineeId: string) => `myfitflow:mock:measurements:${traineeId}`;
const weightLogsKey = (traineeId: string) => `myfitflow:mock:weightlogs:${traineeId}`;

const PLAN_ROTATION = ["Push", "Pull", "Legs"];
const EXERCISES_BY_PLAN: Record<string, string[]> = {
  Push: ["לחיצת חזה עם מוט", "לחיצת כתפיים עם מוט (עמידה)", "פרפר עם משקולות יד"],
  Pull: ["מתח באחיזה רחבה", "חתירה במוט (Bent Over Row)", "כפיפת מרפקים עם מוט W"],
  Legs: ["סקוואט עם מוט אחורי", "דדליפט רומני (RDL)", "לחיצת רגליים (Leg Press)"],
};

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

export const generateMockTraineeData = (traineeId: string) => {
  // 8 weeks, 3 sessions/week, oldest first, with light progressive overload.
  const sessions: MockSession[] = [];
  const setLogs: MockSetLog[] = [];
  let sessionIndex = 0;
  for (let week = 7; week >= 0; week--) {
    for (const dayOffsetInWeek of [0, 2, 4]) {
      const dayOffset = week * 7 + dayOffsetInWeek;
      const planName = PLAN_ROTATION[sessionIndex % PLAN_ROTATION.length];
      const sessionId = `mock-session-${sessionIndex}`;
      const completedAt = daysAgo(dayOffset);
      const durationSeconds = 3000 + Math.round(Math.random() * 1500);
      sessions.push({ id: sessionId, plan_name: planName, duration_seconds: durationSeconds, completed_at: completedAt });

      const progressWeeks = 7 - week; // 0 (oldest) -> 7 (most recent)
      EXERCISES_BY_PLAN[planName].forEach((exerciseName, exIdx) => {
        const baseWeight = 30 + exIdx * 10;
        const weight = baseWeight + progressWeeks * 1.25; // slow progressive overload
        for (let setNum = 0; setNum < 3; setNum++) {
          setLogs.push({
            session_id: sessionId,
            exercise_name: exerciseName,
            weight: Math.round(weight * 2) / 2,
            reps: 6 + Math.round(Math.random() * 4),
            created_at: completedAt,
          });
        }
      });
      sessionIndex++;
    }
  }

  // Weekly weight log, gently trending down.
  const weightLogs: MockWeightLog[] = [];
  for (let week = 7; week >= 0; week--) {
    weightLogs.push({ weight: Math.round((88 - (7 - week) * 0.5) * 10) / 10, logged_at: daysAgo(week * 7) });
  }

  // Measurements every 2 weeks, waist trending down / arms trending up slightly.
  const measurements: MockMeasurement[] = [];
  for (let i = 3; i >= 0; i--) {
    const weeksAgo = i * 2;
    const progress = 3 - i;
    measurements.push({
      id: `mock-measurement-${i}`,
      measured_at: daysAgo(weeksAgo * 7),
      weight: Math.round((88 - progress * 1) * 10) / 10,
      upper_belly: Math.round((92 - progress * 0.8) * 10) / 10,
      lower_belly: Math.round((98 - progress * 0.8) * 10) / 10,
      right_arm: Math.round((36 + progress * 0.3) * 10) / 10,
      left_arm: Math.round((35.5 + progress * 0.3) * 10) / 10,
      shoulder_width: 118,
      right_thigh: Math.round((58 + progress * 0.2) * 10) / 10,
      left_thigh: Math.round((57.5 + progress * 0.2) * 10) / 10,
      notes: null,
    });
  }

  localStorage.setItem(sessionsKey(traineeId), JSON.stringify(sessions));
  localStorage.setItem(setLogsKey(traineeId), JSON.stringify(setLogs));
  localStorage.setItem(weightLogsKey(traineeId), JSON.stringify(weightLogs));
  localStorage.setItem(measurementsKey(traineeId), JSON.stringify(measurements));

  return { sessionsCount: sessions.length, latestWeight: weightLogs[weightLogs.length - 1].weight, measurementsCount: measurements.length };
};

const SAMPLE_NUTRITION_PLAN: PlanMeal[] = [
  { id: "breakfast", name: "בוקר", order: 0, targetCalories: 500, targetProtein: 30, targetCarbs: 60, targetFat: 15, items: [{ id: "b1", foodId: "oats", grams: 60 }, { id: "b2", foodId: "egg", grams: 100 }] },
  { id: "post-workout", name: "פוסט אימון", order: 1, targetCalories: 450, targetProtein: 40, targetCarbs: 50, targetFat: 8, items: [{ id: "p1", foodId: "chicken-breast", grams: 150 }, { id: "p2", foodId: "white-rice", grams: 150 }] },
  { id: "dinner", name: "ערב", order: 2, targetCalories: 550, targetProtein: 35, targetCarbs: 40, targetFat: 20, items: [{ id: "d1", foodId: "salmon", grams: 150 }, { id: "d2", foodId: "sweet-potato", grams: 150 }, { id: "d3", foodId: "broccoli", grams: 100 }] },
];

export const generateMockNutritionPlan = (traineeId: string) => {
  saveBasePlan(traineeId, SAMPLE_NUTRITION_PLAN);
};

export const getMockSessions = (traineeId: string): MockSession[] => JSON.parse(localStorage.getItem(sessionsKey(traineeId)) ?? "[]");
export const getMockSetLogs = (traineeId: string): MockSetLog[] => JSON.parse(localStorage.getItem(setLogsKey(traineeId)) ?? "[]");
export const getMockWeightLogs = (traineeId: string): MockWeightLog[] => JSON.parse(localStorage.getItem(weightLogsKey(traineeId)) ?? "[]");
export const getMockMeasurements = (traineeId: string): MockMeasurement[] => JSON.parse(localStorage.getItem(measurementsKey(traineeId)) ?? "[]");

export const clearMockTraineeData = (traineeId: string) => {
  [sessionsKey, setLogsKey, measurementsKey, weightLogsKey].forEach((fn) => localStorage.removeItem(fn(traineeId)));
};
