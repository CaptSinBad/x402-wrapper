-- Migration 009: Webhooks infrastructure
-- Creates webhook subscriptions, events, and delivery tracking

CREATE TABLE webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] DEFAULT ARRAY[]::TEXT[], -- e.g., ['payment.completed', 'settlement.confirmed', 'payout.created']
  active BOOLEAN DEFAULT true,
  secret TEXT NOT NULL, -- For HMAC signing
  last_delivered_at TIMESTAMP,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_url CHECK (url ~ '^https?://'),
  CONSTRAINT valid_seller CHECK (seller_id != '')
);

CREATE INDEX idx_webhook_subscriptions_seller_id ON webhook_subscriptions(seller_id);
CREATE INDEX idx_webhook_subscriptions_active ON webhook_subscriptions(active) WHERE active = true;

CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- e.g., 'payment.completed', 'settlement.confirmed'
  seller_id TEXT NOT NULL,
  resource_type TEXT NOT NULL, -- e.g., 'payment_attempt', 'settlement', 'payout'
  resource_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_webhook_events_seller_id ON webhook_events(seller_id);
CREATE INDEX idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_events_created_at ON webhook_events(created_at DESC);

CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_subscription_id UUID NOT NULL REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
  webhook_event_id UUID NOT NULL REFERENCES webhook_events(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 'pending', 'success', 'failed', 'retry'
  response_status_code INTEGER,
  response_body TEXT,
  error_message TEXT,
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  next_retry_at TIMESTAMP,
  delivered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'success', 'failed', 'retry')),
  UNIQUE(webhook_subscription_id, webhook_event_id)
);

CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_next_retry_at ON webhook_deliveries(next_retry_at) WHERE status = 'retry';
CREATE INDEX idx_webhook_deliveries_subscription_id ON webhook_deliveries(webhook_subscription_id);

-- Supported webhook events
CREATE TABLE webhook_event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert supported events
INSERT INTO webhook_event_types (event_type, description) VALUES
('payment.attempt.created', 'Payment attempt has been created'),
('payment.completed', 'Payment has been completed/verified'),
('settlement.queued', 'Settlement has been queued for processing'),
('settlement.confirmed', 'Settlement has been confirmed'),
('settlement.failed', 'Settlement has failed'),
('sale.created', 'Sale has been recorded'),
('payout.created', 'Payout has been created'),
('payout.completed', 'Payout has been completed'),
('payout.failed', 'Payout has failed'),
('link.created', 'Payment link has been created'),
('link.expired', 'Payment link has expired');
