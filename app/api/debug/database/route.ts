import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * Debug endpoint to test database connectivity from Vercel
 */
export async function GET(req: NextRequest) {
    const results: any = {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        checks: {},
    };

    // Check 1: DATABASE_URL exists
    results.checks.databaseUrlExists = !!process.env.DATABASE_URL;
    results.checks.databaseUrlValue = process.env.DATABASE_URL
        ? `${process.env.DATABASE_URL.slice(0, 20)}...`
        : 'NOT SET';

    // Check 2: Can connect to database
    try {
        const dbResult = await query('SELECT NOW() as time, version() as version');
        results.checks.databaseConnection = 'SUCCESS';
        results.checks.databaseTime = dbResult.rows[0]?.time;
        results.checks.databaseVersion = dbResult.rows[0]?.version?.split(' ')[0];
    } catch (error: any) {
        results.checks.databaseConnection = 'FAILED';
        results.checks.databaseError = error.message;
    }

    // Check 3: Check if users table exists
    try {
        const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      ) as exists
    `);
        results.checks.usersTableExists = tableCheck.rows[0]?.exists;
    } catch (error: any) {
        results.checks.usersTableExists = 'ERROR';
        results.checks.tableCheckError = error.message;
    }

    // Check 4: Check if privy_id column exists
    try {
        const columnCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'privy_id'
      ) as exists
    `);
        results.checks.privyIdColumnExists = columnCheck.rows[0]?.exists;
    } catch (error: any) {
        results.checks.privyIdColumnExists = 'ERROR';
        results.checks.columnCheckError = error.message;
    }

    return NextResponse.json(results, { status: 200 });
}
