-- security definer helper so RLS policies don't need direct grants on auth.users
create or replace function public.coach_has_access_to_submitter(_submitted_by uuid)
returns boolean
language sql
stable security definer
as $$
  select exists (
    select 1 from public.coach_permissions cp
    where cp.trainee_id = _submitted_by
      and cp.coach_email = (select u.email from auth.users u where u.id = auth.uid())
  );
$$;

drop policy if exists "exercises_select" on public.exercises;
create policy "exercises_select" on public.exercises
for select using (
  status = 'approved'
  or submitted_by = auth.uid()
  or public.coach_has_access_to_submitter(submitted_by)
);

drop policy if exists "exercises_update_by_coach" on public.exercises;
create policy "exercises_update_by_coach" on public.exercises
for update using (
  public.coach_has_access_to_submitter(submitted_by)
);
