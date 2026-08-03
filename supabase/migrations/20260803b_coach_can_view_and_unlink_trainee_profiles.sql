-- coach can read the profile of any trainee that has granted them access
create policy "profiles_select_by_coach" on public.profiles
for select using (
  exists (
    select 1 from public.coach_permissions cp
    where cp.trainee_id = profiles.user_id
      and cp.coach_email = public.current_user_email()
  )
);

-- coach can remove a trainee link on their side too (not just the trainee)
create policy "coach_permissions_delete_by_coach" on public.coach_permissions
for delete using (
  coach_email = public.current_user_email()
);
