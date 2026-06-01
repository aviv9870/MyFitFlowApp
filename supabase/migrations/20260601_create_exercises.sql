-- SQL script for Supabase SQL Editor
create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  name_he text not null,
  name_en text not null,
  primary_muscle text not null, -- Chest, Back, Legs, Shoulders, Biceps, Triceps, Core
  equipment text,               -- Barbell, Dumbbell, Cables, Machine, Bodyweight
  video_url text
);

-- Basic RLS
alter table exercises enable row level security;
create policy "Allow read access for all users" on exercises for select using (true);
