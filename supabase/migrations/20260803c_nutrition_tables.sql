create table public.nutrition_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  order_index integer not null default 0,
  target_calories numeric not null default 0,
  target_protein numeric not null default 0,
  target_carbs numeric not null default 0,
  target_fat numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.nutrition_meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.nutrition_meals(id) on delete cascade,
  order_index integer not null default 0,
  food_id text,
  grams numeric,
  custom_name text,
  custom_calories numeric,
  custom_protein numeric,
  custom_carbs numeric,
  custom_fat numeric
);

create table public.nutrition_eaten_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_id uuid not null references public.nutrition_meals(id) on delete cascade,
  log_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, meal_id, log_date)
);

create table public.nutrition_adherence_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  adherence_pct numeric not null,
  created_at timestamptz not null default now(),
  unique (user_id, log_date)
);

alter table public.nutrition_meals enable row level security;
alter table public.nutrition_meal_items enable row level security;
alter table public.nutrition_eaten_logs enable row level security;
alter table public.nutrition_adherence_logs enable row level security;

-- nutrition_meals: trainee reads their own plan; coach reads+writes (they build it)
create policy "nutrition_meals_select" on public.nutrition_meals
for select using (
  user_id = auth.uid() or public.coach_has_access(public.current_user_email(), user_id)
);
create policy "nutrition_meals_write_by_coach" on public.nutrition_meals
for all using (
  public.coach_has_access(public.current_user_email(), user_id)
) with check (
  public.coach_has_access(public.current_user_email(), user_id)
);

-- nutrition_meal_items: same access, scoped through the parent meal's owner
create policy "nutrition_meal_items_select" on public.nutrition_meal_items
for select using (
  exists (
    select 1 from public.nutrition_meals m
    where m.id = nutrition_meal_items.meal_id
      and (m.user_id = auth.uid() or public.coach_has_access(public.current_user_email(), m.user_id))
  )
);
create policy "nutrition_meal_items_write_by_coach" on public.nutrition_meal_items
for all using (
  exists (
    select 1 from public.nutrition_meals m
    where m.id = nutrition_meal_items.meal_id
      and public.coach_has_access(public.current_user_email(), m.user_id)
  )
) with check (
  exists (
    select 1 from public.nutrition_meals m
    where m.id = nutrition_meal_items.meal_id
      and public.coach_has_access(public.current_user_email(), m.user_id)
  )
);

-- nutrition_eaten_logs: trainee owns marking meals eaten; coach can view only
create policy "nutrition_eaten_logs_select" on public.nutrition_eaten_logs
for select using (
  user_id = auth.uid() or public.coach_has_access(public.current_user_email(), user_id)
);
create policy "nutrition_eaten_logs_write_by_self" on public.nutrition_eaten_logs
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- nutrition_adherence_logs: trainee owns their own daily snapshot; coach can view only
create policy "nutrition_adherence_logs_select" on public.nutrition_adherence_logs
for select using (
  user_id = auth.uid() or public.coach_has_access(public.current_user_email(), user_id)
);
create policy "nutrition_adherence_logs_write_by_self" on public.nutrition_adherence_logs
for all using (user_id = auth.uid()) with check (user_id = auth.uid());
