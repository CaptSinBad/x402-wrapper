-- Create store items and item reservations tables

CREATE TABLE IF NOT EXISTS store_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NULL,
  price_cents BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USDC',
  stock INTEGER NOT NULL DEFAULT 0,
  allow_open_amount BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS store_items_seller_idx ON store_items(seller_id);
CREATE UNIQUE INDEX IF NOT EXISTS store_items_unique_on_seller_slug ON store_items(seller_id, slug);

CREATE TABLE IF NOT EXISTS item_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES store_items(id) ON DELETE CASCADE,
  seller_id TEXT NOT NULL,
  reservation_key UUID NOT NULL,
  qty_reserved INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'reserved', -- reserved, confirmed, released
  reserved_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NULL,
  payment_attempt_id UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS item_reservations_item_idx ON item_reservations(item_id);
CREATE INDEX IF NOT EXISTS item_reservations_seller_idx ON item_reservations(seller_id);
