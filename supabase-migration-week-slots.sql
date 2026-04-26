-- Migration: make available_slots week-specific
-- Run this in Supabase SQL Editor if you already have the old schema.
--
-- The old schema stored slots by day_of_week only (recurring forever).
-- The new schema adds week_start_date so each week is independent.

-- 1. Drop the old unique constraint
ALTER TABLE available_slots
  DROP CONSTRAINT IF EXISTS available_slots_day_of_week_time_slot_key;

-- 2. Add the week_start_date column (nullable first so existing rows don't fail)
ALTER TABLE available_slots
  ADD COLUMN IF NOT EXISTS week_start_date date;

-- 3. Back-fill existing rows: assign them to the current week's Monday
UPDATE available_slots
SET week_start_date = date_trunc('week', now())::date
WHERE week_start_date IS NULL;

-- 4. Make the column NOT NULL now that all rows have a value
ALTER TABLE available_slots
  ALTER COLUMN week_start_date SET NOT NULL;

-- 5. Add the new unique constraint
ALTER TABLE available_slots
  ADD CONSTRAINT available_slots_week_day_time_key
  UNIQUE (week_start_date, day_of_week, time_slot);
