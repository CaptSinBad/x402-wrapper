import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { requireAuth } from '@/lib/auth';

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/dashboard/payments
 * Get all payments/sales for authenticated user
 */
export async function GET(req: NextRequest) {
    try {
        const user = await requireAuth(req);

        // Get user's project IDs
        const projectResult = await pgPool.query(
            `SELECT id FROM projects WHERE user_id = $1`,
            [user.id]
        );

        // Build all possible seller_id formats for backward compatibility:
        // - user.id (old format)
        // - project.id (UUID)
        // - project-{project.id} (legacy format)
        const allSellerIds: string[] = [user.id];

        if (projectResult.rows.length > 0) {
            projectResult.rows.forEach((p: any) => {
                allSellerIds.push(p.id);                    // UUID format
                allSellerIds.push(`project-${p.id}`);       // Legacy format
            });
        }

        const result = await pgPool.query(
            `SELECT 
                id,
                amount_cents,
                currency,
                purchaser_address,
                metadata,
                created_at
             FROM sales
             WHERE seller_id = ANY($1::text[])
             ORDER BY created_at DESC
             LIMIT 100`,
            [allSellerIds]
        );

        const payments = result.rows.map((row: any) => ({
            id: row.id,
            amount: (parseInt(row.amount_cents) / 100).toFixed(2),
            currency: row.currency,
            purchaser: row.purchaser_address,
            status: row.metadata?.status || 'completed',
            txHash: row.metadata?.transaction_hash,
            network: row.metadata?.network || 'base-sepolia',
            paymentLinkToken: row.metadata?.payment_link_token,
            createdAt: row.created_at
        }));

        return NextResponse.json({ payments });
    } catch (error: any) {
        console.error('[dashboard/payments] Error:', error);

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
