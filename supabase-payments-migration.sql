-- Run this in Supabase SQL editor to add payments table

CREATE TABLE IF NOT EXISTS payments (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id      UUID        NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  gateway             TEXT        NOT NULL CHECK (gateway IN ('stripe', 'paypal')),
  amount              NUMERIC(10,2) NOT NULL,
  currency            TEXT        NOT NULL DEFAULT 'usd',
  status              TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  gateway_payment_id  TEXT        UNIQUE,
  paid_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Patients can read their own payments
CREATE POLICY "Users read own payments" ON payments
  FOR SELECT USING (
    appointment_id IN (
      SELECT id FROM appointments WHERE user_id = auth.uid()
    )
  );

-- Service role has full access for webhook writes
CREATE POLICY "Service role full access" ON payments
  FOR ALL TO service_role USING (true) WITH CHECK (true);
