import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/dashboard/transactions
 * Returns paginated transaction list
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = (page - 1) * limit;

        // Get total count
        const countResult = await pgPool.query(
            `SELECT COUNT(*) as total FROM sales`
        );
        const total = parseInt(countResult.rows[0].total);

        // Get paginated transactions
        const transactionsResult = await pgPool.query(
            `SELECT 
         id,
         seller_id,
         amount_cents,
         currency,
         purchaser_address,
         metadata,
         created_at
       FROM sales
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
            [limit, offset]
        );

        const transactions = transactionsResult.rows.map(sale => ({
            id: sale.id,
            sellerId: sale.seller_id,
            amountUSDC: (sale.amount_cents / 100).toFixed(2),
            amountCents: sale.amount_cents,
            currency: sale.currency,
            purchaserAddress: sale.purchaser_address,
            txHash: sale.metadata?.transaction_hash || null,
            network: sale.metadata?.network || 'base-sepolia',
            status: sale.metadata?.status || 'completed',
            createdAt: sale.created_at,
        }));

        return NextResponse.json({
            transactions,
            total,
            page,
            limit,
            hasMore: offset + transactions.length < total,
        });
    } catch (error: any) {
        console.error('[dashboard/transactions] Error:', error);
        return NextResponse.json(
            { error: 'failed_to_fetch_transactions', details: error.message },
            { status: 500 }
        );
    }
}
