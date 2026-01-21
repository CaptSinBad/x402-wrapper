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

        // For TEXT columns (sales, etc): include user.id and project-{id} formats
        const textSellerIds: string[] = [user.id];
        projectsResult.rows.forEach((p: any) => {
            textSellerIds.push(p.id);
            textSellerIds.push(`project-${p.id}`);
        });

        // For UUID columns (payment_links): only include valid UUIDs (project IDs)
        const uuidSellerIds: string[] = projectIds;

        // Get payment links count (UUID column) - only if we have project IDs
        let linksCount = 0;
        if (uuidSellerIds.length > 0) {
            try {
                const linksResult = await pgPool.query(
                    `SELECT COUNT(*) as count FROM payment_links WHERE seller_id = ANY($1::uuid[])`,
                    [uuidSellerIds]
                );
                linksCount = parseInt(linksResult.rows[0].count);
            } catch (e) {
                console.error('Error querying payment_links:', e);
            }
        }

        // Get sales count (TEXT column)
        let salesCount = 0;
        try {
            const salesResult = await pgPool.query(
                `SELECT COUNT(*) as count FROM sales WHERE seller_id = ANY($1::text[])`,
                [textSellerIds]
            );
            salesCount = parseInt(salesResult.rows[0].count);
        } catch (e) {
            console.error('Error querying sales:', e);
        }

        // Get all payment links seller_ids to debug
        let allLinksSellerIds: any[] = [];
        try {
            const allLinksResult = await pgPool.query(
                `SELECT seller_id::text, COUNT(*) as count FROM payment_links GROUP BY seller_id LIMIT 20`
            );
            allLinksSellerIds = allLinksResult.rows;
        } catch (e) {
            console.error('Error getting all payment link seller IDs:', e);
        }

        // Get all sales seller_ids to debug
        let allSalesSellerIds: any[] = [];
        try {
            const allSalesResult = await pgPool.query(
                `SELECT seller_id, COUNT(*) as count FROM sales GROUP BY seller_id LIMIT 20`
            );
            allSalesSellerIds = allSalesResult.rows;
        } catch (e) {
            console.error('Error getting all sales seller IDs:', e);
        }

        return NextResponse.json({
            user: {
                id: user.id,
                privy_id: user.privy_id,
                email: user.email,
                wallet_address: user.wallet_address,
            },
            projects: projectsResult.rows,
            sellerIds: {
                uuidSellerIds,  // For payment_links (UUID column)
                textSellerIds,  // For sales (TEXT column)
            },
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
