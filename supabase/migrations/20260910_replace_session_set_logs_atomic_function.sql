-- Atomically replace all set logs of one workout session.
--
-- WorkoutSummaryModal and the post-workout edit screen used to do this
-- client-side as delete-then-insert. When the insert failed (e.g. a decimal in
-- the integer reps column) the delete had already happened: the summary
-- modal's restore re-dated every set to now(), and the post-workout screen had
-- no restore at all, so its sets were simply gone. As one function call it
-- runs in a single transaction, and a failed insert rolls the delete back.
--
-- SECURITY INVOKER (the default), so RLS on workout_set_logs still applies.
-- The explicit ownership check additionally stops a caller from attaching rows
-- to someone else's session_id, which the insert policy alone would allow
-- since it only checks user_id.
create or replace function public.replace_session_set_logs(p_session_id uuid, p_rows jsonb)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_completed_at timestamptz;
begin
  select completed_at into v_completed_at
  from workout_sessions
  where id = p_session_id and user_id = auth.uid();

  if not found then
    raise exception 'workout session % not found', p_session_id using errcode = 'P0002';
  end if;

  delete from workout_set_logs where session_id = p_session_id;

  insert into workout_set_logs (
    session_id, user_id, exercise_name, set_number, weight, reps, exercise_order, created_at
  )
  select
    p_session_id,
    auth.uid(),
    r->>'exercise_name',
    (r->>'set_number')::int,
    (r->>'weight')::numeric,
    (r->>'reps')::int,
    nullif(r->>'exercise_order', '')::int,
    -- A row without a date belongs to the day of the workout, not to today.
    coalesce(nullif(r->>'created_at', '')::timestamptz, v_completed_at)
  from jsonb_array_elements(p_rows) as r;
end;
$$;

revoke execute on function public.replace_session_set_logs(uuid, jsonb) from public, anon;
grant execute on function public.replace_session_set_logs(uuid, jsonb) to authenticated;
