-- Run this in your Supabase SQL editor
-- Adds the prescriptions table with RLS so patients can only read their own

CREATE TABLE IF NOT EXISTS prescriptions (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_id UUID       REFERENCES appointments(id) ON DELETE SET NULL,
  diagnosis     TEXT        NOT NULL,
  doctor_note   TEXT        NOT NULL DEFAULT '',
  medications   JSONB       NOT NULL DEFAULT '[]',
  follow_up     DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast patient lookups
CREATE INDEX IF NOT EXISTS prescriptions_patient_id_idx ON prescriptions(patient_id);

-- Enable Row Level Security
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

-- Patients can read only their own prescriptions
CREATE POLICY "patients_read_own" ON prescriptions
  FOR SELECT USING (auth.uid() = patient_id);

-- Service role (used by server API routes) has full access
CREATE POLICY "service_role_all" ON prescriptions
  FOR ALL USING (true);
