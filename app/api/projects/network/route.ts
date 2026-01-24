import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { requireAuth } from '@/lib/auth';

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * PATCH /api/projects/network
 * Update the network for user's project (testnet/mainnet toggle)
 */
export async function PATCH(req: NextRequest) {
    try {
        const user = await requireAuth(req);
        const body = await req.json();
        const { network } = body;

        // Validate network
        const validNetworks = ['base-sepolia', 'base-mainnet'];
        if (!network || !validNetworks.includes(network)) {
            return NextResponse.json(
                { error: 'Invalid network. Must be "base-sepolia" or "base-mainnet"' },
                { status: 400 }
            );
        }

        // Update user's project network
        const result = await pgPool.query(
            `UPDATE projects 
             SET x402_network = $1, updated_at = NOW()
             WHERE user_id = $2::uuid
             RETURNING id, name, x402_network`,
            [network, user.id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: 'No project found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            project: result.rows[0],
            network: result.rows[0].x402_network
        });
    } catch (error: any) {
        console.error('[projects/network] Error:', error);

        if (error.message === 'Unauthorized') {
            return NextResponse.json(
                { error: 'unauthorized' },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { error: 'internal_error', message: error.message },
            { status: 500 }
        );
    }
}

/**
 * GET /api/projects/network
 * Get the current network for user's project
 */
export async function GET(req: NextRequest) {
    try {
        const user = await requireAuth(req);

        const result = await pgPool.query(
            `SELECT id, name, x402_network FROM projects WHERE user_id = $1::uuid ORDER BY created_at DESC LIMIT 1`,
            [user.id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({
                network: 'base-sepolia', // default
                project: null
            });
        }

        return NextResponse.json({
            network: result.rows[0].x402_network || 'base-sepolia',
            project: result.rows[0]
        });
    } catch (error: any) {
        console.error('[projects/network] Error:', error);

        if (error.message === 'Unauthorized') {
            return NextResponse.json(
                { error: 'unauthorized' },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { error: 'internal_error', message: error.message },
            { status: 500 }
        );
    }
}
