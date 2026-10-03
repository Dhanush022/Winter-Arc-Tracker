-- Winter Arc Tracker metric + hidden habits migration
-- Run this in your Supabase SQL Editor.

-- 1) Add numeric step/water metrics to habit_logs
ALTER TABLE habit_logs ADD COLUMN IF NOT EXISTS steps INTEGER DEFAULT 0;
ALTER TABLE habit_logs ADD COLUMN IF NOT EXISTS water INTEGER DEFAULT 0;

-- 2) Remove habits we no longer track (logs should cascade)
DELETE FROM habits WHERE name IN ('Healthy Meals', 'Meditate / Journal', 'Wake Up Early', 'Sleep On Time');

-- 3) Keep streak helpers from overcounting removed/hidden habits
--    Re-create the default-habits function for future signups.
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
