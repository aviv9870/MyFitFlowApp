-- DRAFT — not applied to the live database. Prepared ahead of time so RPE/RIR/tempo
-- tracking (spec section 2) can move from the local-only overlay (src/services/
-- workoutExtrasLocal.ts) to real columns once the schema change is approved.

-- Target-side: what the coach plans for an exercise within a workout plan.
alter table workout_plan_exercises
  add column if not exists target_rpe numeric,
  add column if not exists target_rir numeric,
  add column if not exists tempo text; -- e.g. "3-1-1-0" (eccentric-pause-concentric-pause)

-- Actual-side: what the trainee reports they did, per logged set.
alter table workout_set_logs
  add column if not exists rpe numeric,
  add column if not exists rir numeric;
