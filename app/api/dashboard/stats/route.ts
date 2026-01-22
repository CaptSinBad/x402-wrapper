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

        // Get user's projects - projects.user_id is UUID
        const projectsResult = await pgPool.query(
            `SELECT id FROM projects WHERE user_id = $1::uuid`,
            [user.id]
        );

        const projectIds: string[] = projectsResult.rows.map((p: any) => p.id);

        // Both sales.seller_id and payment_links.seller_id are UUID type
        // Include both user.id and all project IDs as valid seller IDs
        const allSellerIds: string[] = [user.id, ...projectIds];

        // If no valid seller IDs, return zeros
        if (allSellerIds.length === 0) {
            return NextResponse.json({
                totalRevenue: '0.00',
                totalRevenueCents: 0,
                activeEndpoints: 0,
                totalPayments: 0,
                recentSales: [],
            });
        }

        // Total revenue from completed sales (in USDC cents) for this merchant
        // sales.seller_id is UUID type
        const revenueResult = await pgPool.query(
            `SELECT COALESCE(SUM(amount_cents), 0) as total_revenue
             FROM sales
             WHERE seller_id = ANY($1::uuid[])
             AND (metadata->>'status' = 'completed' OR metadata->>'status' IS NULL)`,
            [allSellerIds]
        );

        const totalRevenueCents = parseInt(revenueResult.rows[0].total_revenue);
        const totalRevenueUSDC = (totalRevenueCents / 100).toFixed(2);

        // Active endpoints for this merchant
        let activeEndpoints = 0;
        try {
            const endpointsResult = await pgPool.query(
                `SELECT COUNT(*) as count FROM seller_endpoints WHERE seller_id = ANY($1::uuid[])`,
                [allSellerIds]
            );
            activeEndpoints = parseInt(endpointsResult.rows[0].count);
        } catch (e) {
            // seller_endpoints might have TEXT type, try with text cast
            try {
                const endpointsResult = await pgPool.query(
                    `SELECT COUNT(*) as count FROM seller_endpoints WHERE seller_id = ANY($1::text[])`,
                    [allSellerIds]
                );
                activeEndpoints = parseInt(endpointsResult.rows[0].count);
            } catch (e2) {
                console.error('seller_endpoints query failed:', e2);
            }
        }

        // Total payments this month for this merchant
        const paymentsResult = await pgPool.query(
            `SELECT COUNT(*) as count
             FROM sales
             WHERE seller_id = ANY($1::uuid[])
             AND created_at >= date_trunc('month', CURRENT_DATE)`,
            [allSellerIds]
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
             WHERE seller_id = ANY($1::uuid[])
             ORDER BY created_at DESC
             LIMIT 5`,
            [allSellerIds]
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
