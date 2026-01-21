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

        const projectIds: string[] = projectsResult.rows.map((p: any) => p.id);

        // For TEXT columns (sales, etc): include user.id and project-{id} formats
        const textSellerIds: string[] = [user.id];
        projectsResult.rows.forEach((p: any) => {
            textSellerIds.push(p.id);
            textSellerIds.push(`project-${p.id}`);
        });

        // For UUID columns (payment_links): only include valid UUIDs
        const uuidSellerIds: string[] = projectIds;

        // Get payment links count (UUID column)
        let linksCount = 0;
        if (uuidSellerIds.length > 0) {
            const linksResult = await pgPool.query(
                `SELECT COUNT(*) as count FROM payment_links WHERE seller_id = ANY($1::uuid[])`,
                [uuidSellerIds]
            );
            linksCount = parseInt(linksResult.rows[0].count);
        }

        // Get sales count (TEXT column)
        const salesResult = await pgPool.query(
            `SELECT COUNT(*) as count FROM sales WHERE seller_id = ANY($1::text[])`,
            [textSellerIds]
        );
        const salesCount = parseInt(salesResult.rows[0].count);

        // Get all payment links seller_ids to debug
        const allLinksResult = await pgPool.query(
            `SELECT seller_id::text, COUNT(*) as count FROM payment_links GROUP BY seller_id LIMIT 20`
        );

        // Get all sales seller_ids to debug
        const allSalesResult = await pgPool.query(
            `SELECT seller_id, COUNT(*) as count FROM sales GROUP BY seller_id LIMIT 20`
        );

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
            allPaymentLinkSellerIds: allLinksResult.rows,
            allSalesSellerIds: allSalesResult.rows,
        });
    } catch (error: any) {
        console.error('[debug/user-data] Error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
