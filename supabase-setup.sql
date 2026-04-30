-- ================================================================
--  Complete Database Setup
--  Run once in Supabase SQL Editor to create all tables fresh.
--  Safe to re-run: drops all tables and recreates them cleanly.
-- ================================================================

-- ── Drop (leaf → root to respect FK order) ───────────────────
DROP TABLE IF EXISTS notification_log CASCADE;
DROP TABLE IF EXISTS prescriptions    CASCADE;
DROP TABLE IF EXISTS payments         CASCADE;
DROP TABLE IF EXISTS available_slots  CASCADE;
DROP TABLE IF EXISTS booked_slots     CASCADE;
DROP TABLE IF EXISTS appointments     CASCADE;


-- ── 1. appointments ───────────────────────────────────────────
CREATE TABLE appointments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date       TEXT        NOT NULL,   -- "YYYY-MM-DD"
  time       TEXT        NOT NULL,   -- "9:00 AM"
  type       TEXT        NOT NULL,
  mode       TEXT        NOT NULL DEFAULT 'In-Person',  -- 'In-Person' | 'Video'
  status     TEXT        NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appt_select_own"  ON appointments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "appt_insert_own"  ON appointments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "appt_update_own"  ON appointments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "appt_service_all" ON appointments FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE appointments;


-- ── 2. booked_slots ───────────────────────────────────────────
--    Cross-user slot availability (no PII exposed — only date + time)
CREATE TABLE booked_slots (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID        NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  date           TEXT        NOT NULL,
  time           TEXT        NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX booked_slots_date_idx ON booked_slots (date);

ALTER TABLE booked_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "slots_select_auth" ON booked_slots FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "slots_insert_auth" ON booked_slots FOR INSERT WITH CHECK (auth.role() = 'authenticated');

ALTER PUBLICATION supabase_realtime ADD TABLE booked_slots;


-- ── 3. available_slots ────────────────────────────────────────
--    Doctor-managed weekly slot grid (each week is independent)
CREATE TABLE available_slots (
  id              UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start_date DATE     NOT NULL,          -- Monday of the week  e.g. 2026-05-05
  day_of_week     SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),  -- 1=Mon … 7=Sun
  time_slot       TEXT     NOT NULL,          -- e.g. '9:00 AM'
  is_active       BOOLEAN  NOT NULL DEFAULT true,
  UNIQUE (week_start_date, day_of_week, time_slot)
);

ALTER TABLE available_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "avail_select_all"  ON available_slots FOR SELECT USING (true);
CREATE POLICY "avail_service_all" ON available_slots FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ── 4. payments ───────────────────────────────────────────────
CREATE TABLE payments (
  id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id     UUID          NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  gateway            TEXT          NOT NULL CHECK (gateway IN ('stripe', 'paypal')),
  amount             NUMERIC(10,2) NOT NULL,
  currency           TEXT          NOT NULL DEFAULT 'usd',
  status             TEXT          NOT NULL DEFAULT 'pending'
                                   CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  gateway_payment_id TEXT          UNIQUE,
  paid_at            TIMESTAMPTZ,
  created_at         TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX payments_appointment_id_idx ON payments (appointment_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_select_own" ON payments
  FOR SELECT USING (
    appointment_id IN (SELECT id FROM appointments WHERE user_id = auth.uid())
  );
CREATE POLICY "payments_service_all" ON payments FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ── 6. prescriptions ──────────────────────────────────────────
CREATE TABLE prescriptions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  appointment_id UUID        REFERENCES appointments(id) ON DELETE SET NULL,
  diagnosis      TEXT        NOT NULL,
  doctor_note    TEXT        NOT NULL DEFAULT '',
  medications    JSONB       NOT NULL DEFAULT '[]',
  follow_up      DATE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX prescriptions_patient_id_idx ON prescriptions (patient_id);

ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rx_select_own"  ON prescriptions FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "rx_service_all" ON prescriptions FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ── 7. notification_log ───────────────────────────────────────
--    Deduplicates emails — one row per (appointment, email type)
CREATE TABLE notification_log (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID        NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  type           TEXT        NOT NULL
                             CHECK (type IN ('confirmation', 'reminder_24h', 'reminder_1h')),
  sent_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (appointment_id, type)
);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_select_own" ON notification_log
  FOR SELECT USING (
    appointment_id IN (SELECT id FROM appointments WHERE user_id = auth.uid())
  );
CREATE POLICY "notif_service_all" ON notification_log FOR ALL TO service_role USING (true) WITH CHECK (true);
