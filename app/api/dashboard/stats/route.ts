import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/dashboard/stats
 * Returns real-time dashboard statistics
 */
export async function GET() {
    try {
        // Total revenue from completed sales (in USDC cents)
        const revenueResult = await pgPool.query(
            `SELECT COALESCE(SUM(amount_cents), 0) as total_revenue
       FROM sales
       WHERE metadata->>'status' = 'completed' OR metadata->>'status' IS NULL`
        );

        const totalRevenueCents = parseInt(revenueResult.rows[0].total_revenue);
        const totalRevenueUSDC = (totalRevenueCents / 100).toFixed(2);

        // Active endpoints
        const endpointsResult = await pgPool.query(
            `SELECT COUNT(*) as count FROM seller_endpoints`
        );
        const activeEndpoints = parseInt(endpointsResult.rows[0].count);

        // Total payments this month
        const paymentsResult = await pgPool.query(
            `SELECT COUNT(*) as count
       FROM sales
       WHERE created_at >= date_trunc('month', CURRENT_DATE)`
        );
        const totalPayments = parseInt(paymentsResult.rows[0].count);

        // Recent sales (last 5)
        const recentSalesResult = await pgPool.query(
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
       LIMIT 5`
        );

        const recentSales = recentSalesResult.rows.map((sale: any) => ({
            id: sale.id,
            sellerId: sale.seller_id,
            amountUSDC: (sale.amount_cents / 100).toFixed(2),
            currency: sale.currency,
            purchaserAddress: sale.purchaser_address,
            txHash: sale.metadata?.transaction_hash || null,
            network: sale.metadata?.network || 'base-sepolia',
            status: sale.metadata?.status || 'completed',
            createdAt: sale.created_at,
        }));

        return NextResponse.json({
            totalRevenue: totalRevenueUSDC,
            totalRevenueCents: totalRevenueCents,
            activeEndpoints,
            totalPayments,
            recentSales,
        });
    } catch (error: any) {
        console.error('[dashboard/stats] Error:', error);
        return NextResponse.json(
            { error: 'failed_to_fetch_stats', details: error.message },
            { status: 500 }
        );
    }
}
