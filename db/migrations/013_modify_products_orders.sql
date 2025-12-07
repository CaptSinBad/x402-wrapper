-- Migration 013: Modify products and orders for stores
-- Links products to stores and adds platform fee tracking

-- Add store_id to products table
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);

-- Add platform fee to orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS platform_fee_cents INTEGER DEFAULT 0;

-- Add platform fee to checkout_sessions table
ALTER TABLE checkout_sessions
  ADD COLUMN IF NOT EXISTS platform_fee_cents INTEGER DEFAULT 0;
