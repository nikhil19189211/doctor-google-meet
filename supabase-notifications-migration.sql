-- Migration: notification_log table
-- Tracks which notifications have been sent to prevent duplicates from the cron job.
-- Run this in your Supabase SQL editor.

create table if not exists notification_log (
  id            uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  type          text not null, -- 'confirmation' | 'reminder_24h' | 'reminder_15m'
  sent_at       timestamptz not null default now()
);

create unique index if not exists notification_log_appt_type
  on notification_log (appointment_id, type);

-- Add phone column to auth user metadata via profiles table (optional helper)
-- If you want to store patient phone separately from auth.users metadata:
create table if not exists profiles (
  id    uuid primary key references auth.users(id) on delete cascade,
  phone text
);

alter table profiles enable row level security;

create policy "Users read own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users update own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "Users insert own profile"
  on profiles for insert
  with check (auth.uid() = id);
