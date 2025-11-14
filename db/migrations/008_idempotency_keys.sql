-- 008_idempotency_keys.sql
-- Table to persist idempotency keys for payment attempts
CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL,
  seller_id TEXT NULL,
  payment_attempt_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (idempotency_key, seller_id)
);

CREATE INDEX IF NOT EXISTS idempotency_keys_key_idx ON idempotency_keys(idempotency_key);
