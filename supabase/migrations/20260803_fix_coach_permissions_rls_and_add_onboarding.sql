-- reusable security-definer helper: current caller's email, without requiring
-- callers to have a direct grant on auth.users
create or replace function public.current_user_email()
returns text
language sql
stable security definer
as $$
  select email from auth.users where id = auth.uid();
$$;

drop policy if exists "coach_email_select" on public.coach_permissions;
create policy "coach_email_select" on public.coach_permissions
for select using (
  coach_email = public.current_user_email()
);

-- onboarding tracking: existing users are already onboarded; new signups default to false
alter table public.user_settings
  add column if not exists onboarded boolean not null default true;

alter table public.user_settings
  alter column onboarded set default false;
