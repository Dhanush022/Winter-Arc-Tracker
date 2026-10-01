-- Migration: Fix leaderboard RLS policies
-- Run this in the Supabase SQL Editor on your existing database.
-- It drops the old owner-only SELECT policies and lets everyone (authenticated)
-- read the tables the leaderboard needs. Writes stay owner-only.

DROP POLICY IF EXISTS "Users can view own habits" ON habits;
DROP POLICY IF EXISTS "Users can view own habit logs" ON habit_logs;
DROP POLICY IF EXISTS "Users can view own sleep logs" ON sleep_logs;
DROP POLICY IF EXISTS "Users can view own macro logs" ON macro_logs;
DROP POLICY IF EXISTS "Users can view own checkins" ON weekly_checkins;
DROP POLICY IF EXISTS "Users can view own freezes" ON streak_freezes;

CREATE POLICY "Habits are viewable by everyone" ON habits FOR SELECT USING (true);
CREATE POLICY "Habit logs are viewable by everyone" ON habit_logs FOR SELECT USING (true);
CREATE POLICY "Sleep logs are viewable by everyone" ON sleep_logs FOR SELECT USING (true);
CREATE POLICY "Macro logs are viewable by everyone" ON macro_logs FOR SELECT USING (true);
CREATE POLICY "Checkins are viewable by everyone" ON weekly_checkins FOR SELECT USING (true);
CREATE POLICY "Freezes are viewable by everyone" ON streak_freezes FOR SELECT USING (true);
