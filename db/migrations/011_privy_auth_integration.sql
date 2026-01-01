-- Phase 2: Add Privy authentication fields to users table
-- This migration adds columns to map Privy users to our database

-- Add Privy ID column (unique identifier from Privy)
ALTER TABLE users ADD COLUMN IF NOT EXISTS privy_id TEXT UNIQUE;

-- Add authentication metadata
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_method TEXT DEFAULT 'wallet';
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Add role and permission columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Add business logic columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_withdrawal_limit DECIMAL(10,2) DEFAULT 1000.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS withdrawn_today DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_withdrawal_reset TIMESTAMP DEFAULT NOW();

-- Add timestamps
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_privy_id ON users(privy_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Comments for documentation
COMMENT ON COLUMN users.privy_id IS 'Unique identifier from Privy authentication service';
COMMENT ON COLUMN users.role IS 'User role: user, merchant, admin, super_admin';
COMMENT ON COLUMN users.status IS 'Account status: active, suspended, deleted';
COMMENT ON COLUMN users.auth_method IS 'Authentication method: wallet, email, social';
