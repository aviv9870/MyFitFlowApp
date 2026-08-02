// Local-only overlay for workout fields not yet in the real Supabase schema
// (RPE/RIR/tempo — see supabase/migrations/20260726_add_rpe_rir_tempo.sql).
// Keyed by the real IDs the app already generates (plan id, exercise id, session
// id, set number), so swapping this for real columns later is a pure data-layer
// change — no UI rework needed.

export interface PlanExerciseExtras {
  targetRpe: number | null;
  targetRir: number | null;
  tempo: string;
}

export interface SetExtras {
  rpe: number | null;
  rir: number | null;
}

const planExtrasKey = (planId: string) => `myfitflow:workout:planExtras:${planId}`;
const setExtrasKey = (sessionId: string) => `myfitflow:workout:setExtras:${sessionId}`;

export const getPlanExerciseExtras = (planId: string): Record<string, PlanExerciseExtras> => {
  const raw = localStorage.getItem(planExtrasKey(planId));
  return raw ? JSON.parse(raw) : {};
};

export const savePlanExerciseExtras = (planId: string, extras: Record<string, PlanExerciseExtras>) => {
  localStorage.setItem(planExtrasKey(planId), JSON.stringify(extras));
};

// Keyed by `${exerciseName}:${setNumber}` — matches how workout_set_logs rows
// are matched elsewhere in the app (there's no per-set id, just session+name+number).
export const getSetExtras = (sessionId: string): Record<string, SetExtras> => {
  const raw = localStorage.getItem(setExtrasKey(sessionId));
  return raw ? JSON.parse(raw) : {};
};

export const saveSetExtras = (sessionId: string, extras: Record<string, SetExtras>) => {
  localStorage.setItem(setExtrasKey(sessionId), JSON.stringify(extras));
};

export const setExtrasEntryKey = (exerciseName: string, setNumber: number) => `${exerciseName}:${setNumber}`;
