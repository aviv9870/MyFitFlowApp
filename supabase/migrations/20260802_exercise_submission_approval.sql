-- add submission/approval tracking to exercises
alter table public.exercises
  add column if not exists status text not null default 'approved',
  add column if not exists submitted_by uuid references auth.users(id);

alter table public.exercises
  add constraint exercises_status_check check (status in ('pending', 'approved', 'rejected'));

-- drop redundant/overly-permissive read policies
drop policy if exists "Allow read access for all users" on public.exercises;
drop policy if exists "exercises_public_read" on public.exercises;
drop policy if exists "exercises_read" on public.exercises;

-- read: approved exercises are public; pending/rejected visible only to the submitter
-- and to a coach who has a coach_permissions relationship with that submitter
create policy "exercises_select" on public.exercises
for select using (
  status = 'approved'
  or submitted_by = auth.uid()
  or exists (
    select 1 from public.coach_permissions cp
    where cp.trainee_id = exercises.submitted_by
      and cp.coach_email = (select u.email from auth.users u where u.id = auth.uid())
  )
);

-- insert: any authenticated user may submit a new exercise, always as pending, tagged as themselves
create policy "exercises_insert_own_pending" on public.exercises
for insert with check (
  submitted_by = auth.uid()
  and status = 'pending'
);

-- update: only a coach with a permissions relationship to the submitter may approve/reject
create policy "exercises_update_by_coach" on public.exercises
for update using (
  exists (
    select 1 from public.coach_permissions cp
    where cp.trainee_id = exercises.submitted_by
      and cp.coach_email = (select u.email from auth.users u where u.id = auth.uid())
  )
);
