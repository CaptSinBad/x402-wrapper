// Apply categories migration to production DB
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function main() {
    console.log('Creating categories table...\n');

    try {
        // 1. Create categories table
        console.log('1. Creating categories table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS categories (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
              name TEXT NOT NULL,
              description TEXT,
              slug TEXT NOT NULL,
              display_order INTEGER DEFAULT 0,
              active BOOLEAN DEFAULT true,
              created_at TIMESTAMPTZ DEFAULT NOW(),
              updated_at TIMESTAMPTZ DEFAULT NOW(),
              UNIQUE(store_id, slug)
            );
        `);
        console.log('✓ Categories table created\n');

        // 2. Create indexes
        console.log('2. Creating indexes...');
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_categories_store ON categories(store_id);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(active);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_categories_display_order ON categories(store_id, display_order);`);
        console.log('✓ Indexes created\n');

        // 3. Add category_id to products
        console.log('3. Adding category_id to products...');
        await pool.query(`
            ALTER TABLE products 
              ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
        `);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);`);
        console.log('✓ Products modified\n');

        // 4. Create trigger
        console.log('4. Creating trigger...');
        await pool.query(`
            DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
            CREATE TRIGGER update_categories_updated_at
                BEFORE UPDATE ON categories
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        `);
        console.log('✓ Trigger created\n');

        console.log('✅ Categories migration applied successfully!');

    } catch (err) {
        console.error('❌ Error:', err.message);
        throw err;
    } finally {
        await pool.end();
    }
}

main().catch(console.error);
