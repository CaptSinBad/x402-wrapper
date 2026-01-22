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

        // Get user's projects - user_id is UUID
        const projectsResult = await pgPool.query(
            `SELECT id::text, name, environment, x402_network, created_at FROM projects WHERE user_id = $1::uuid`,
            [user.id]
        );

        const projectIds: string[] = projectsResult.rows.map((p: any) => p.id);

        // All seller_id columns are now UUID type
        // Include both user.id and project IDs as valid seller IDs
        const allSellerIds: string[] = [user.id, ...projectIds];

        // Get payment links count (UUID column)
        let linksCount = 0;
        try {
            const linksResult = await pgPool.query(
                `SELECT COUNT(*) as count FROM payment_links WHERE seller_id = ANY($1::uuid[])`,
                [allSellerIds]
            );
            linksCount = parseInt(linksResult.rows[0].count);
        } catch (e: any) {
            console.error('Error querying payment_links:', e.message);
        }

        // Get sales count (UUID column)
        let salesCount = 0;
        try {
            const salesResult = await pgPool.query(
                `SELECT COUNT(*) as count FROM sales WHERE seller_id = ANY($1::uuid[])`,
                [allSellerIds]
            );
            salesCount = parseInt(salesResult.rows[0].count);
        } catch (e: any) {
            console.error('Error querying sales:', e.message);
        }

        // Get all payment links seller_ids to debug
        let allLinksSellerIds: any[] = [];
        try {
            const allLinksResult = await pgPool.query(
                `SELECT seller_id::text, COUNT(*) as count FROM payment_links GROUP BY seller_id LIMIT 20`
            );
            allLinksSellerIds = allLinksResult.rows;
        } catch (e: any) {
            console.error('Error getting all payment link seller IDs:', e.message);
        }

        // Get all sales seller_ids to debug
        let allSalesSellerIds: any[] = [];
        try {
            const allSalesResult = await pgPool.query(
                `SELECT seller_id::text, COUNT(*) as count FROM sales GROUP BY seller_id LIMIT 20`
            );
            allSalesSellerIds = allSalesResult.rows;
        } catch (e: any) {
            console.error('Error getting all sales seller IDs:', e.message);
        }

        return NextResponse.json({
            user: {
                id: user.id,
                privy_id: user.privy_id,
                email: user.email,
                wallet_address: user.wallet_address,
            },
            projects: projectsResult.rows,
            sellerIds: allSellerIds,
            counts: {
                paymentLinks: linksCount,
                sales: salesCount,
            },
            allPaymentLinkSellerIds: allLinksSellerIds,
            allSalesSellerIds: allSalesSellerIds,
        });
    } catch (error: any) {
        console.error('[debug/user-data] Error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
