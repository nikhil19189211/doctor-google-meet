-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)
-- Creates a table to store the VideoSDK meeting ID per appointment

create table if not exists video_sessions (
  appointment_id uuid primary key references appointments(id) on delete cascade,
  meeting_id     text not null,
  created_at     timestamptz default now()
);

-- Allow the service role (used by supabaseAdmin) full access
alter table video_sessions enable row level security;

create policy "Service role full access" on video_sessions
  for all using (true) with check (true);
