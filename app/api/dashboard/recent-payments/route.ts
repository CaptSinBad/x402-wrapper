import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { requireAuth } from '@/lib/auth';

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/dashboard/recent-payments
 * Get recent payments for authenticated user
 */
export async function GET(req: NextRequest) {
    try {
        const user = await requireAuth(req);

        // Get user's projects
        const projectsResult = await pgPool.query(
            `SELECT id FROM projects WHERE user_id = $1`,
            [user.id]
        );

        if (projectsResult.rows.length === 0) {
            return NextResponse.json({ payments: [] });
        }

        const projectIds = projectsResult.rows.map((p: any) => p.id);

        // Get recent sales
        const result = await pgPool.query(
            `SELECT 
        s.id,
        s.purchaser_address,
        s.amount_cents,
        s.currency,
        s.metadata,
        s.created_at,
        s.seller_id
       FROM sales s
       WHERE s.seller_id = ANY($1)
       ORDER BY s.created_at DESC
       LIMIT 10`,
            [projectIds.map((id: string) => `project-${id}`)]
        );

        const payments = result.rows.map((payment: any) => ({
            id: payment.id,
            customer: payment.purchaser_address
                ? `${payment.purchaser_address.slice(0, 6)}...${payment.purchaser_address.slice(-4)}`
                : 'Unknown',
            amount: `$${(payment.amount_cents / 100).toFixed(2)}`,
            status: payment.metadata?.status || 'completed',
            date: formatDate(payment.created_at),
            txHash: payment.metadata?.transaction_hash,
        }));

        return NextResponse.json({ payments });
    } catch (error: any) {
        console.error('[dashboard/recent-payments] Error:', error);

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

function formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours} hours ago`;
    if (days === 1) return '1 day ago';
    if (days < 7) return `${days} days ago`;

    return new Date(date).toLocaleDateString();
}
