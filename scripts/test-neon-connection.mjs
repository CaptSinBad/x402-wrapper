// Test Neon database connection and check schema
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL ||
    'postgresql://neondb_owner:npg_qvgF2Wo4MHmA@ep-ancient-firefly-ad8428h7-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function testConnection() {
    console.log('🔌 Testing Neon database connection...\n');

    try {
        const sql = neon(DATABASE_URL);

        // Test basic connectivity
        console.log('1. Testing connection...');
        const timeResult = await sql`SELECT NOW() as current_time`;
        console.log('✅ Connected! Server time:', timeResult[0].current_time);

        // Check for required tables
        console.log('\n2. Checking for required tables...');
        const tables = await sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;

        console.log(`Found ${tables.length} tables:`);
        tables.forEach(t => console.log(`   - ${t.tablename}`));

        // Check specifically for auth tables
        const requiredTables = ['users', 'onboarding_progress', 'projects'];
        const existingTables = tables.map(t => t.tablename);
        const missingTables = requiredTables.filter(t => !existingTables.includes(t));

        if (missingTables.length > 0) {
            console.log('\n⚠️  Missing required tables:', missingTables.join(', '));
            console.log('\nYou need to run migrations:');
            console.log('  node scripts/apply-migrations.js');
        } else {
            console.log('\n✅ All required tables exist!');

            // Get row counts
            console.log('\n3. Table statistics:');
            for (const table of requiredTables) {
                const count = await sql`SELECT COUNT(*) as count FROM ${sql(table)}`;
                console.log(`   - ${table}: ${count[0].count} rows`);
            }
        }

        console.log('\n✅ Database is ready for Vercel deployment!');

    } catch (error) {
        console.error('\n❌ Connection failed:', error.message);
        console.error('\nCheck:');
        console.error('  1. DATABASE_URL is correct');
        console.error('  2. Neon database is not paused/deleted');
        console.error('  3. Network connectivity');
        process.exit(1);
    }
}

testConnection();
