-- Winter Arc Tracker profile + workout feature migration
-- Run this in your Supabase SQL Editor.

alter table profiles add column if not exists public_profile boolean default true;
alter table profiles add column if not exists season_theme text default 'winter';
alter table profiles add column if not exists accent_color text default '#ea580c';

create table if not exists workout_routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  split text not null,
  exercises jsonb default '[]',
  created_at timestamptz default now(),
  unique(user_id, split)
);

create table if not exists workout_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  date date not null,
  split text not null,
  exercise text not null,
  sets integer default 0,
  reps integer default 0,
  weight numeric(6,1) default 0,
  created_at timestamptz default now()
);

alter table workout_routines enable row level security;
alter table workout_entries enable row level security;

create policy "Workout routines are viewable by everyone" on workout_routines for select using (true);
create policy "Users can insert own workout routines" on workout_routines for insert with check (auth.uid() = user_id);
create policy "Users can update own workout routines" on workout_routines for update using (auth.uid() = user_id);
create policy "Users can delete own workout routines" on workout_routines for delete using (auth.uid() = user_id);

create policy "Workout entries are viewable by everyone" on workout_entries for select using (true);
create policy "Users can insert own workout entries" on workout_entries for insert with check (auth.uid() = user_id);
create policy "Users can update own workout entries" on workout_entries for update using (auth.uid() = user_id);
create policy "Users can delete own workout entries" on workout_entries for delete using (auth.uid() = user_id);
