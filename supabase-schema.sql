-- Winter Arc Tracker Database Schema
-- Run this in your Supabase SQL Editor

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  avatar_color TEXT DEFAULT '#f97316',
  goal_mode TEXT DEFAULT 'maintain' CHECK (goal_mode IN ('bulk', 'cut', 'maintain')),
  macro_targets JSONB DEFAULT '{"protein": 150, "carbs": 250, "fat": 70, "calories": 2500}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habits table
CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  custom BOOLEAN DEFAULT FALSE,
  "order" INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habit logs table
CREATE TABLE IF NOT EXISTS habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  steps INTEGER DEFAULT 0,
  water INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, habit_id, date)
);

-- Sleep logs table
CREATE TABLE IF NOT EXISTS sleep_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hours NUMERIC(4,1) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Macro logs table
CREATE TABLE IF NOT EXISTS macro_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  protein INTEGER DEFAULT 0,
  carbs INTEGER DEFAULT 0,
  fat INTEGER DEFAULT 0,
  calories INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Mood logs table
CREATE TABLE IF NOT EXISTS mood_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  energy INTEGER CHECK (energy >= 1 AND energy <= 5),
  mood INTEGER CHECK (mood >= 1 AND mood <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Weekly check-ins table
CREATE TABLE IF NOT EXISTS weekly_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week INTEGER NOT NULL CHECK (week >= 1 AND week <= 13),
  weight NUMERIC(5,1),
  wins TEXT,
  focus TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week)
);

-- Monthly reflections table
CREATE TABLE IF NOT EXISTS monthly_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month TEXT NOT NULL CHECK (month IN ('october', 'november', 'december')),
  win TEXT,
  lesson TEXT,
  improve TEXT,
  next_goal TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month)
);

-- Streak freezes table
CREATE TABLE IF NOT EXISTS streak_freezes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_used DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Badges table
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE macro_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE streak_freezes ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all profiles (for leaderboard), but only update their own
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Habits: everyone can view (needed for leaderboard), users manage their own
CREATE POLICY "Habits are viewable by everyone" ON habits FOR SELECT USING (true);
CREATE POLICY "Users can insert own habits" ON habits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habits" ON habits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own habits" ON habits FOR DELETE USING (auth.uid() = user_id);

-- Habit logs: everyone can view (needed for leaderboard), users manage their own
CREATE POLICY "Habit logs are viewable by everyone" ON habit_logs FOR SELECT USING (true);
CREATE POLICY "Users can insert own habit logs" ON habit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habit logs" ON habit_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own habit logs" ON habit_logs FOR DELETE USING (auth.uid() = user_id);

-- Sleep logs: everyone can view (needed for leaderboard), users manage their own
CREATE POLICY "Sleep logs are viewable by everyone" ON sleep_logs FOR SELECT USING (true);
CREATE POLICY "Users can insert own sleep logs" ON sleep_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sleep logs" ON sleep_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sleep logs" ON sleep_logs FOR DELETE USING (auth.uid() = user_id);

-- Macro logs: everyone can view (needed for leaderboard), users manage their own
CREATE POLICY "Macro logs are viewable by everyone" ON macro_logs FOR SELECT USING (true);
CREATE POLICY "Users can insert own macro logs" ON macro_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own macro logs" ON macro_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own macro logs" ON macro_logs FOR DELETE USING (auth.uid() = user_id);

-- Mood logs: users can only manage their own logs
CREATE POLICY "Users can view own mood logs" ON mood_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own mood logs" ON mood_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own mood logs" ON mood_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own mood logs" ON mood_logs FOR DELETE USING (auth.uid() = user_id);

-- Weekly check-ins: everyone can view (needed for leaderboard), users manage their own
CREATE POLICY "Checkins are viewable by everyone" ON weekly_checkins FOR SELECT USING (true);
CREATE POLICY "Users can insert own checkins" ON weekly_checkins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own checkins" ON weekly_checkins FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own checkins" ON weekly_checkins FOR DELETE USING (auth.uid() = user_id);

-- Monthly reflections: users can only manage their own
CREATE POLICY "Users can view own reflections" ON monthly_reflections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reflections" ON monthly_reflections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reflections" ON monthly_reflections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reflections" ON monthly_reflections FOR DELETE USING (auth.uid() = user_id);

-- Streak freezes: everyone can view (needed for leaderboard), users insert their own
CREATE POLICY "Freezes are viewable by everyone" ON streak_freezes FOR SELECT USING (true);
CREATE POLICY "Users can insert own freezes" ON streak_freezes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Badges: users can view all badges (for leaderboard), only insert own
CREATE POLICY "Badges are viewable by everyone" ON badges FOR SELECT USING (true);
CREATE POLICY "Users can insert own badges" ON badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to create default habits for new users
CREATE OR REPLACE FUNCTION create_default_habits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO habits (user_id, name, custom, "order") VALUES
    (NEW.id, 'Workout / Exercise', FALSE, 1),
    (NEW.id, '10,000 Steps', FALSE, 2),
    (NEW.id, 'Drink 3L Water', FALSE, 3),
    (NEW.id, 'No Junk Food', FALSE, 4),
    (NEW.id, 'Read / Learn', FALSE, 5),
    (NEW.id, 'Be Productive', FALSE, 6),
    (NEW.id, 'Custom Habit 1', TRUE, 7),
    (NEW.id, 'Custom Habit 2', TRUE, 8);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create habits when a profile is created
CREATE OR REPLACE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_habits();

-- Function to create profile when user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_color)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    '#f97316'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
