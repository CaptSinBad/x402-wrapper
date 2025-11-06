-- Add pricing model columns to seller_endpoints and create activation_codes table

ALTER TABLE IF EXISTS seller_endpoints
  ADD COLUMN IF NOT EXISTS pricing_type TEXT NOT NULL DEFAULT 'per_request',
  ADD COLUMN IF NOT EXISTS billing_interval TEXT NULL,
  ADD COLUMN IF NOT EXISTS billing_amount BIGINT NULL;

CREATE TABLE IF NOT EXISTS activation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  seller_endpoint_id UUID REFERENCES seller_endpoints(id) ON DELETE CASCADE,
  buyer_address TEXT NULL,
  amount BIGINT NULL,
  currency TEXT NULL,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE NULL,
  used BOOLEAN DEFAULT FALSE,
  used_by TEXT NULL,
  metadata JSONB NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
