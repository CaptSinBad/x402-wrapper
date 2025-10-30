
-- Initial DB schema for x402-wrapper

-- sellers (basic owner/account info)
CREATE TABLE IF NOT EXISTS sellers (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	owner_email TEXT,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- seller_endpoints: endpoints registered by sellers that define payment requirements
CREATE TABLE IF NOT EXISTS seller_endpoints (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	seller_wallet TEXT NOT NULL,
	endpoint_url TEXT NOT NULL,
	price BIGINT NOT NULL,
	currency TEXT NOT NULL DEFAULT 'USDC',
	scheme TEXT NOT NULL DEFAULT 'exact',
	network TEXT,
	facilitator_url TEXT,
	metadata JSONB,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS seller_endpoints_seller_wallet_idx ON seller_endpoints(seller_wallet);
CREATE UNIQUE INDEX IF NOT EXISTS seller_endpoints_unique_on_wallet_url ON seller_endpoints(seller_wallet, endpoint_url);

-- payments: attempts / logs for incoming payment headers and verification
CREATE TABLE IF NOT EXISTS payment_attempts (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	seller_endpoint_id UUID REFERENCES seller_endpoints(id) ON DELETE SET NULL,
	payment_payload JSONB,
	verifier_response JSONB,
	status TEXT NOT NULL DEFAULT 'pending', -- pending, verified, failed
	client_ip INET,
	user_agent TEXT,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_attempts_endpoint_idx ON payment_attempts(seller_endpoint_id);

-- settlements: records for settlement requests and results
CREATE TABLE IF NOT EXISTS settlements (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	payment_attempt_id UUID REFERENCES payment_attempts(id) ON DELETE SET NULL,
	facilitator_request JSONB,
	facilitator_response JSONB,
	status TEXT NOT NULL DEFAULT 'queued', -- queued, submitted, confirmed, failed
	tx_hash TEXT,
	chain TEXT,
	confirmations INTEGER DEFAULT 0,
	attempts INTEGER DEFAULT 0,
	last_error TEXT,
		next_retry_at TIMESTAMP WITH TIME ZONE,
			locked_by TEXT,
			locked_at TIMESTAMP WITH TIME ZONE,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
	updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- generic payment logs for auditing
CREATE TABLE IF NOT EXISTS payment_logs (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	level TEXT NOT NULL DEFAULT 'info',
	message TEXT,
	meta JSONB,
	endpoint_id UUID,
	payer_address TEXT,
	tx_hash TEXT,
	amount TEXT,
	asset TEXT,
	network TEXT,
	success BOOLEAN,
	response JSONB,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Basic extension: a table for facilitator configurations (optional)
CREATE TABLE IF NOT EXISTS facilitators (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	name TEXT NOT NULL,
	base_url TEXT NOT NULL,
	api_key TEXT,
	metadata JSONB,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- NOTE: Adjust types (e.g. gen_random_uuid()) depending on your PG extensions. If using older Postgres, replace gen_random_uuid() with uuid_generate_v4().
-- Add migrations for your environment and wire to your deployment pipeline.

