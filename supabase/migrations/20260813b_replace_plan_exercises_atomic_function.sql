-- PlanEditor previously did delete-then-insert as two separate client
-- calls: if the insert failed after the delete succeeded (network error,
-- validation error), the plan was left with zero exercises with no way
-- to recover. This wraps the swap in a single transaction. SECURITY
-- INVOKER (the default) so RLS still applies as the calling user -
-- exactly the same permission checks as the two separate calls had.
create or replace function replace_plan_exercises(p_plan_id uuid, p_rows jsonb)
returns void
language plpgsql
as $$
begin
  delete from workout_plan_exercises where plan_id = p_plan_id;

  insert into workout_plan_exercises (
    plan_id, exercise_id, target_sets, rest_seconds, order_index, group_id, group_type, notes
  )
  select
    p_plan_id,
    (r->>'exercise_id')::uuid,
    (r->>'target_sets')::int,
    (r->>'rest_seconds')::int,
    (r->>'order_index')::int,
    nullif(r->>'group_id', '')::uuid,
    nullif(r->>'group_type', ''),
    nullif(r->>'notes', '')
  from jsonb_array_elements(p_rows) as r;
end;
$$;
