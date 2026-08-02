// Local-only persistence for the nutrition module (phase 1 scaffolding).
// Keeps the same shape a real Supabase-backed service would have, so swapping
// the storage layer later doesn't require touching the UI.
import type { PlanMeal, DayMeal } from "@/domain/nutrition-calculations";

const planKey = (traineeId: string) => `myfitflow:nutrition:plan:${traineeId}`;
const eatenKey = (traineeId: string, date: string) => `myfitflow:nutrition:eaten:${traineeId}:${date}`;

export const todayKey = () => new Date().toISOString().slice(0, 10);

export const getBasePlan = (traineeId: string): PlanMeal[] => {
  const raw = localStorage.getItem(planKey(traineeId));
  return raw ? JSON.parse(raw) : [];
};

export const saveBasePlan = (traineeId: string, meals: PlanMeal[]) => {
  localStorage.setItem(planKey(traineeId), JSON.stringify(meals));
};

const getEatenMealIds = (traineeId: string, date: string): string[] => {
  const raw = localStorage.getItem(eatenKey(traineeId, date));
  return raw ? JSON.parse(raw) : [];
};

const setEatenMealIds = (traineeId: string, date: string, ids: string[]) => {
  localStorage.setItem(eatenKey(traineeId, date), JSON.stringify(ids));
};

// The trainee's menu is only the coach's plan — the coach has sole control
// (including deletions), so today's view is computed live from the plan every
// time rather than copied into separate per-day storage. The only thing the
// trainee owns is which meals they've marked "eaten" today.
export const getTodayView = (traineeId: string, date: string): DayMeal[] => {
  const plan = getBasePlan(traineeId);
  const eatenIds = new Set(getEatenMealIds(traineeId, date));
  return plan.map((meal) => ({ ...meal, eaten: eatenIds.has(meal.id) }));
};

export const toggleMealEaten = (traineeId: string, date: string, mealId: string) => {
  const ids = new Set(getEatenMealIds(traineeId, date));
  if (ids.has(mealId)) ids.delete(mealId);
  else ids.add(mealId);
  setEatenMealIds(traineeId, date, Array.from(ids));
};

// --- Daily adherence history (weekly-trend feature) ---
// A per-day snapshot of how closely the trainee hit their nutrition targets.
// Stored as a map date -> adherence% so recording is idempotent (re-recording
// the same day overwrites rather than duplicating).
export interface AdherencePoint {
  date: string;
  adherence: number;
}

const adherenceKey = (traineeId: string) => `myfitflow:nutrition:adherence:${traineeId}`;

const getAdherenceMap = (traineeId: string): Record<string, number> => {
  const raw = localStorage.getItem(adherenceKey(traineeId));
  return raw ? JSON.parse(raw) : {};
};

export const recordDayAdherence = (traineeId: string, date: string, adherence: number) => {
  const map = getAdherenceMap(traineeId);
  map[date] = adherence;
  localStorage.setItem(adherenceKey(traineeId), JSON.stringify(map));
};

// Overwrite the whole adherence history at once (used by the mock-data seeder).
export const setAdherenceHistory = (traineeId: string, points: AdherencePoint[]) => {
  const map: Record<string, number> = {};
  points.forEach((p) => { map[p.date] = p.adherence; });
  localStorage.setItem(adherenceKey(traineeId), JSON.stringify(map));
};

// The last `days` calendar days (default 7), oldest-first, filling gaps with null
// so a missing day shows up as "no data" rather than silently collapsing the axis.
export const getAdherenceHistory = (traineeId: string, days = 7): { date: string; adherence: number | null }[] => {
  const map = getAdherenceMap(traineeId);
  const out: { date: string; adherence: number | null }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, adherence: key in map ? map[key] : null });
  }
  return out;
};

// Average adherence over the recorded window — used for the coach's "% reporting"
// summary metric. Ignores days with no data.
export const averageAdherence = (traineeId: string, days = 7): number | null => {
  const points = getAdherenceHistory(traineeId, days).filter((p) => p.adherence !== null);
  if (points.length === 0) return null;
  return points.reduce((a, p) => a + (p.adherence as number), 0) / points.length;
};
