-- 006_payment_links.sql
-- Table for short payment links that map to an item or endpoint
CREATE TABLE IF NOT EXISTS payment_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  seller_id uuid NULL,
  item_id uuid NULL,
  endpoint_id uuid NULL,
  price_cents bigint NULL,
  currency text NULL,
  network text NULL,
  metadata jsonb NULL,
  expires_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payment_links_token_idx ON payment_links(token);
