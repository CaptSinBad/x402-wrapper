// Apply stores migrations with trigger function
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function main() {
    console.log('Creating trigger function and stores table...\n');

    try {
        // 1. Create trigger function if it doesn't exist
        console.log('1. Creating update_updated_at_column function...');
        await pool.query(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        `);
        console.log('✓ Trigger function created\n');

        // 2. Create stores table
        console.log('2. Creating stores table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS stores (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              store_name TEXT NOT NULL,
              store_slug TEXT UNIQUE NOT NULL,
              description TEXT,
              logo_url TEXT,
              banner_url TEXT,
              theme_color TEXT DEFAULT '#2B5FA5',
              active BOOLEAN DEFAULT true,
              created_at TIMESTAMPTZ DEFAULT NOW(),
              updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('✓ Stores table created\n');

        // 3. Create indexes
        console.log('3. Creating indexes...');
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_stores_user ON stores(user_id);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_stores_slug ON stores(store_slug);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_stores_active ON stores(active);`);
        console.log('✓ Indexes created\n');

        // 4. Create trigger
        console.log('4. Creating trigger...');
        await pool.query(`
            DROP TRIGGER IF EXISTS update_stores_updated_at ON stores;
            CREATE TRIGGER update_stores_updated_at
                BEFORE UPDATE ON stores
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        `);
        console.log('✓ Trigger created\n');

        // 5. Modify products table
        console.log('5. Adding store_id to products...');
        await pool.query(`
            ALTER TABLE products 
              ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
        `);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);`);
        console.log('✓ Products modified\n');

        // 6. Modify checkout_sessions and orders
        console.log('6. Adding platform_fee_cents...');
        await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS platform_fee_cents INTEGER DEFAULT 0;`);
        await pool.query(`ALTER TABLE checkout_sessions ADD COLUMN IF NOT EXISTS platform_fee_cents INTEGER DEFAULT 0;`);
        console.log('✓ Fee columns added\n');

        console.log('✅ All migrations applied successfully!');

    } catch (err) {
        console.error('❌ Error:', err.message);
        throw err;
    } finally {
        await pool.end();
    }
}

main().catch(console.error);
