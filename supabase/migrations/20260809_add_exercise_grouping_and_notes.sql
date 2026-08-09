alter table public.workout_plan_exercises
  add column group_id uuid null,
  add column group_type text null,
  add column notes text null;

alter table public.workout_plan_exercises
  add constraint workout_plan_exercises_group_type_check
  check (group_type is null or group_type in ('superset', 'triset'));

create index if not exists idx_workout_plan_exercises_group_id
  on public.workout_plan_exercises (group_id)
  where group_id is not null;
