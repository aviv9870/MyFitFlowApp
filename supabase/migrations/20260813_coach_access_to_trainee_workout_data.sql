-- Coaches could not actually see or edit their trainees' workout data:
-- workout_sessions/workout_set_logs/body_weight_logs/workout_plans/
-- workout_plan_exercises only had `auth.uid() = user_id` policies, with
-- no coach-access policy at all, unlike exercises/nutrition tables which
-- already use coach_has_access(). This silently made the coach dashboard's
-- history/progress/weight tabs always show "no data" for real trainees,
-- and made saving a plan on behalf of a trainee fail RLS entirely.

-- Read access to a trainee's logged workout data
create policy "sessions_select_coach" on workout_sessions for select
  using (coach_has_access(current_user_email(), user_id));

create policy "set_logs_select_coach" on workout_set_logs for select
  using (coach_has_access(current_user_email(), user_id));

create policy "weight_logs_select_coach" on body_weight_logs for select
  using (coach_has_access(current_user_email(), user_id));

-- Full CRUD on a trainee's plans, since PlanEditor lets a coach build
-- plans on the trainee's behalf (workout_plans.user_id = trainee_id)
create policy "plans_select_coach" on workout_plans for select
  using (coach_has_access(current_user_email(), user_id));
create policy "plans_insert_coach" on workout_plans for insert
  with check (coach_has_access(current_user_email(), user_id));
create policy "plans_update_coach" on workout_plans for update
  using (coach_has_access(current_user_email(), user_id));
create policy "plans_delete_coach" on workout_plans for delete
  using (coach_has_access(current_user_email(), user_id));

create policy "plan_ex_select_coach" on workout_plan_exercises for select
  using (exists (
    select 1 from workout_plans p
    where p.id = workout_plan_exercises.plan_id
      and coach_has_access(current_user_email(), p.user_id)
  ));
create policy "plan_ex_insert_coach" on workout_plan_exercises for insert
  with check (exists (
    select 1 from workout_plans p
    where p.id = workout_plan_exercises.plan_id
      and coach_has_access(current_user_email(), p.user_id)
  ));
create policy "plan_ex_update_coach" on workout_plan_exercises for update
  using (exists (
    select 1 from workout_plans p
    where p.id = workout_plan_exercises.plan_id
      and coach_has_access(current_user_email(), p.user_id)
  ));
create policy "plan_ex_delete_coach" on workout_plan_exercises for delete
  using (exists (
    select 1 from workout_plans p
    where p.id = workout_plan_exercises.plan_id
      and coach_has_access(current_user_email(), p.user_id)
  ));
