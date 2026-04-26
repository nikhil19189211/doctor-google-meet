-- Run this in your Supabase SQL Editor (dashboard.supabase.com → SQL Editor)

-- Drop existing table if it was created without the correct columns
drop table if exists appointments cascade;

create table appointments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  date text not null,
  time text not null,
  type text not null,
  mode text not null default 'In-Person',
  status text not null default 'pending',
  created_at timestamptz default now()
);

-- Row Level Security: each user sees only their own appointments
alter table appointments enable row level security;

create policy "Users can view own appointments"
  on appointments for select
  using (auth.uid() = user_id);

create policy "Users can insert own appointments"
  on appointments for insert
  with check (auth.uid() = user_id);

create policy "Users can update own appointments"
  on appointments for update
  using (auth.uid() = user_id);

-- Enable real-time for the appointments table
-- (In Supabase dashboard: Database → Replication → enable appointments table)
alter publication supabase_realtime add table appointments;

-- ─────────────────────────────────────────────────────────────
-- booked_slots: cross-user slot availability (no PII exposed)
-- Run this block after the appointments table is created
-- ─────────────────────────────────────────────────────────────
drop table if exists booked_slots cascade;

create table booked_slots (
  id uuid default gen_random_uuid() primary key,
  appointment_id uuid references appointments(id) on delete cascade not null,
  date text not null,
  time text not null,
  created_at timestamptz default now()
);

-- Index for fast per-date lookups
create index booked_slots_date_idx on booked_slots (date);

alter table booked_slots enable row level security;

-- Any authenticated user can see which slots are taken (only date+time, no PII)
create policy "Authenticated users can view booked slots"
  on booked_slots for select
  using (auth.role() = 'authenticated');

-- Authenticated users can insert when they book
create policy "Authenticated users can insert booked slots"
  on booked_slots for insert
  with check (auth.role() = 'authenticated');

-- Enable real-time so slot grid updates live across all patients
alter publication supabase_realtime add table booked_slots;

-- ─────────────────────────────────────────────────────────────
-- available_slots: Doctor-managed weekly slot availability
-- ─────────────────────────────────────────────────────────────
drop table if exists available_slots cascade;

create table available_slots (
  id uuid default gen_random_uuid() primary key,
  week_start_date date not null,          -- Monday of the week (ISO date, e.g. 2026-04-21)
  day_of_week smallint not null check (day_of_week between 1 and 7),
  -- 1=Monday, 2=Tuesday, ..., 6=Saturday, 7=Sunday
  time_slot text not null,                -- e.g. '9:00 AM'
  is_active boolean not null default true,
  unique (week_start_date, day_of_week, time_slot)
);

-- Public read: patients need to see which slots are available
alter table available_slots enable row level security;

create policy "Anyone can read available slots"
  on available_slots for select
  using (true);

-- Only service role (admin API routes) can mutate
create policy "Service role manages available slots"
  on available_slots for all
  using (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────
-- doctor_meetings: Persists Daily.co rooms created by doctor
-- ─────────────────────────────────────────────────────────────
drop table if exists doctor_meetings cascade;

create table doctor_meetings (
  id uuid default gen_random_uuid() primary key,
  room_name text not null,
  room_url  text not null,
  code      text not null,
  created_at timestamptz default now(),
  expires_at timestamptz not null,
  is_active  boolean not null default true
);

alter table doctor_meetings enable row level security;

create policy "Service role manages doctor meetings"
  on doctor_meetings for all
  using (auth.role() = 'service_role');

create policy "Authenticated users can read meetings"
  on doctor_meetings for select
  using (auth.role() = 'authenticated');
