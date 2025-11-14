-- 007_payouts.sql
-- Table for seller payouts (offramp requests)
CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id TEXT NOT NULL,
  amount_cents BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USDC',
  method TEXT NOT NULL, -- onchain | bank | stablecoin
  destination JSONB NULL, -- method-specific destination (address, bank account id, etc.)
  status TEXT NOT NULL DEFAULT 'requested', -- requested | processing | completed | failed
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ NULL,
  metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payouts_seller_idx ON payouts(seller_id);
CREATE INDEX IF NOT EXISTS payouts_status_idx ON payouts(status);
