-- Sales table records completed sales tied to reservations and payment attempts

CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id TEXT NOT NULL,
  item_id UUID REFERENCES store_items(id) ON DELETE SET NULL,
  item_title TEXT NULL,
  reservation_id UUID REFERENCES item_reservations(id) ON DELETE SET NULL,
  payment_attempt_id UUID REFERENCES payment_attempts(id) ON DELETE SET NULL,
  settlement_id UUID REFERENCES settlements(id) ON DELETE SET NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  amount_cents BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USDC',
  purchaser_address TEXT NULL,
  metadata JSONB NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sales_seller_idx ON sales(seller_id);
CREATE INDEX IF NOT EXISTS sales_item_idx ON sales(item_id);
