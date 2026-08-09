// Local-only overlay for workout fields not yet in the real Supabase schema
// (tempo). Keyed by the real IDs the app already generates (plan id, exercise
// id), so swapping this for real columns later is a pure data-layer change —
// no UI rework needed.

export interface PlanExerciseExtras {
  tempo: string;
}

const planExtrasKey = (planId: string) => `myfitflow:workout:planExtras:${planId}`;

export const getPlanExerciseExtras = (planId: string): Record<string, PlanExerciseExtras> => {
  const raw = localStorage.getItem(planExtrasKey(planId));
  return raw ? JSON.parse(raw) : {};
};

export const savePlanExerciseExtras = (planId: string, extras: Record<string, PlanExerciseExtras>) => {
  localStorage.setItem(planExtrasKey(planId), JSON.stringify(extras));
};
