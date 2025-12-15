import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { createSession } from '@/lib/session';

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export async function POST(req: NextRequest) {
    try {
        const { address, chainId } = await req.json();

        // Check if user exists
        let user = await pgPool.query(
            `SELECT * FROM users WHERE wallet_address = $1`,
            [address]
        );

        if (user.rows.length === 0) {
            // Create new user
            user = await pgPool.query(
                `INSERT INTO users (wallet_address, auth_method) VALUES ($1, 'wallet') RETURNING *`,
                [address]
            );

            // Initialize onboarding progress
            await pgPool.query(
                `INSERT INTO onboarding_progress (user_id, completed, current_step) VALUES ($1, false, 1)`,
                [user.rows[0].id]
            );
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
