-- 010_users_and_auth.sql
-- User authentication and project management tables

-- users: Basic user accounts (wallet-based or email)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE,
  email TEXT UNIQUE,
  full_name TEXT,
  auth_method TEXT NOT NULL DEFAULT 'wallet', -- 'wallet', 'social_google', 'social_discord', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_wallet_idx ON users(wallet_address);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);

-- projects: User's API projects (like Stripe's workspaces)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'test', -- 'test' or 'live'
  public_key TEXT UNIQUE NOT NULL,
  secret_key_hash TEXT NOT NULL,
  webhook_secret TEXT,
  
  -- x402 integration
  x402_tenant_id TEXT,
  x402_network TEXT DEFAULT 'base-sepolia',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS projects_user_idx ON projects(user_id);
CREATE INDEX IF NOT EXISTS projects_public_key_idx ON projects(public_key);

-- onboarding_progress: Track user onboarding completion
CREATE TABLE IF NOT EXISTS onboarding_progress (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  account_type TEXT, -- 'individual', 'business'
  business_name TEXT,
  website TEXT,
  industry TEXT,
  country TEXT,
  
  -- Settlement preferences
  settlement_wallet TEXT,
  stablecoin_preference TEXT DEFAULT 'USDC',
  
  -- Bank details (for future fiat conversion)
  bank_name TEXT,
  bank_account_number TEXT,
  bank_routing_number TEXT,
  bank_country TEXT,
  kyc_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  kyc_submitted_at TIMESTAMP WITH TIME ZONE,
  
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  current_step INTEGER DEFAULT 1,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- sessions: User sessions for auth
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sessions_user_idx ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_token_idx ON user_sessions(token);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON user_sessions(expires_at);
