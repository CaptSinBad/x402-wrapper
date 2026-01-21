import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { requireAuth } from '@/lib/auth';

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/debug/user-data
 * Debug endpoint to check user's data in the database
 */
export async function GET(req: NextRequest) {
    try {
        const user = await requireAuth(req);

        // Get user's projects
        const projectsResult = await pgPool.query(
            `SELECT id, name, environment, x402_network, created_at FROM projects WHERE user_id = $1`,
            [user.id]
        );

        // Build all seller IDs
        const allSellerIds: string[] = [user.id];
        projectsResult.rows.forEach((p: any) => {
            allSellerIds.push(p.id);
            allSellerIds.push(`project-${p.id}`);
        });

        // Get payment links count
        const linksResult = await pgPool.query(
            `SELECT COUNT(*) as count FROM payment_links WHERE seller_id = ANY($1)`,
            [allSellerIds]
        );

        // Get sales count
        const salesResult = await pgPool.query(
            `SELECT COUNT(*) as count FROM sales WHERE seller_id = ANY($1)`,
            [allSellerIds]
        );

        // Get all payment links seller_ids to debug
        const allLinksResult = await pgPool.query(
            `SELECT seller_id, COUNT(*) as count FROM payment_links GROUP BY seller_id LIMIT 20`
        );

        return NextResponse.json({
            user: {
                id: user.id,
                privy_id: user.privy_id,
                email: user.email,
                wallet_address: user.wallet_address,
            },
            projects: projectsResult.rows,
            sellerIdsSearched: allSellerIds,
            paymentLinksCount: parseInt(linksResult.rows[0].count),
            salesCount: parseInt(salesResult.rows[0].count),
            allPaymentLinkSellerIds: allLinksResult.rows,
        });
    } catch (error: any) {
        console.error('[debug/user-data] Error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
