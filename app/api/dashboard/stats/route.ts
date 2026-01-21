import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { requireAuth } from '@/lib/auth';

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/dashboard/stats
 * Returns real-time dashboard statistics for the authenticated user (merchant-specific)
 */
export async function GET(req: NextRequest) {
    try {
        const user = await requireAuth(req);

        // Get user's projects
        const projectsResult = await pgPool.query(
            `SELECT id FROM projects WHERE user_id = $1`,
            [user.id]
        );

        const projectIds: string[] = projectsResult.rows.map((p: any) => p.id);

        // For TEXT columns (sales): include user.id and project-{id} formats
        const textSellerIds: string[] = [user.id];
        projectsResult.rows.forEach((p: any) => {
            textSellerIds.push(p.id);
            textSellerIds.push(`project-${p.id}`);
        });

        // Total revenue from completed sales (in USDC cents) for this merchant
        // sales.seller_id is TEXT type
        const revenueResult = await pgPool.query(
            `SELECT COALESCE(SUM(amount_cents), 0) as total_revenue
             FROM sales
             WHERE seller_id = ANY($1::text[])
             AND (metadata->>'status' = 'completed' OR metadata->>'status' IS NULL)`,
            [textSellerIds]
        );

        const totalRevenueCents = parseInt(revenueResult.rows[0].total_revenue);
        const totalRevenueUSDC = (totalRevenueCents / 100).toFixed(2);

        // Active endpoints for this merchant (seller_endpoints.seller_id is likely TEXT)
        const endpointsResult = await pgPool.query(
            `SELECT COUNT(*) as count FROM seller_endpoints WHERE seller_id = ANY($1::text[])`,
            [textSellerIds]
        );
        const activeEndpoints = parseInt(endpointsResult.rows[0].count);

        // Total payments this month for this merchant
        const paymentsResult = await pgPool.query(
            `SELECT COUNT(*) as count
             FROM sales
             WHERE seller_id = ANY($1::text[])
             AND created_at >= date_trunc('month', CURRENT_DATE)`,
            [textSellerIds]
        );
        const totalPayments = parseInt(paymentsResult.rows[0].count);

        // Recent sales (last 5) for this merchant
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
             WHERE seller_id = ANY($1::text[])
             ORDER BY created_at DESC
             LIMIT 5`,
            [textSellerIds]
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
