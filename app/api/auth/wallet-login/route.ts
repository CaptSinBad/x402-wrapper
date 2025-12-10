import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { createSession } from '../../../../lib/session';

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * POST /api/auth/wallet-login
 * Authenticate or create user with wallet address
 */
export async function POST(req: NextRequest) {
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL is not defined');
        return NextResponse.json(
            { error: 'configuration_error', message: 'Database configuration missing' },
            { status: 500 }
        );
    }

    try {
        const { walletAddress, signature, message } = await req.json();

        if (!walletAddress) {
            return NextResponse.json(
                { error: 'wallet_address_required' },
                { status: 400 }
            );
        }

        // TODO: Verify signature if provided
        // For now, we'll trust the wallet address from the frontend
        // In production, you should verify the signature matches the message

        // Check if user exists
        let user = await pgPool.query(
            `SELECT * FROM users WHERE wallet_address = $1`,
            [walletAddress.toLowerCase()]
        );

        if (user.rows.length === 0) {
            // Create new user
            const result = await pgPool.query(
                `INSERT INTO users (wallet_address, auth_method) 
         VALUES ($1, $2) 
         RETURNING *`,
                [walletAddress.toLowerCase(), 'wallet']
            );
            user = result;
        }

        const userId = user.rows[0].id;

        // Create session
        const token = await createSession(userId);

        // Check if onboarding is complete
        const onboarding = await pgPool.query(
            `SELECT completed FROM onboarding_progress WHERE user_id = $1`,
            [userId]
        );

        const needsOnboarding = onboarding.rows.length === 0 || !onboarding.rows[0].completed;

        return NextResponse.json({
            success: true,
            user: {
                id: user.rows[0].id,
                walletAddress: user.rows[0].wallet_address,
                authMethod: user.rows[0].auth_method,
            },
            needsOnboarding,
            redirectTo: needsOnboarding ? '/onboarding/step-1' : '/dashboard',
        });
    } catch (error: any) {
        console.error('[auth/wallet-login] Error:', error);
        return NextResponse.json(
            { error: 'internal_error', message: error.message },
            { status: 500 }
        );
    }
}
