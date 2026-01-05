import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { requireAuth } from '../../../../lib/session';

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Type for the database query result
interface PaymentLinkRow {
    id: string;
    token: string;
    seller_id: string;
    price_cents: number;
    currency: string;
    network: string;
    metadata?: {
        name?: string;
        description?: string;
        imageUrl?: string;
        brandColor?: string;
    };
    expires_at: Date | null;
    created_at: Date;
    payment_count: string; // COUNT returns string from pg
    total_revenue_cents: string; // SUM returns string from pg
}

/**
 * GET /api/payment-links/list
 * List all payment links for authenticated user
 */
export async function GET(req: NextRequest) {
    try {
        const user = await requireAuth(req);

        const result = await pgPool.query(
            `SELECT 
                pl.*,
                COUNT(DISTINCT s.id) as payment_count,
                COALESCE(SUM(s.amount_cents), 0) as total_revenue_cents
             FROM payment_links pl
             LEFT JOIN sales s ON s.metadata->>'payment_link_token' = pl.token
             WHERE pl.seller_id = $1
             GROUP BY pl.id
             ORDER BY pl.created_at DESC`,
            [user.id]
        );

        const links = result.rows.map((row: PaymentLinkRow) => ({
            id: row.id,
            token: row.token,
            name: row.metadata?.name || 'Untitled',
            description: row.metadata?.description || '',
            price: row.price_cents / 100,
            currency: row.currency,
            network: row.network,
            imageUrl: row.metadata?.imageUrl,
            brandColor: row.metadata?.brandColor || '#2B5FA5',
            paymentCount: parseInt(row.payment_count),
            totalRevenue: parseFloat(row.total_revenue_cents) / 100,
            expiresAt: row.expires_at,
            createdAt: row.created_at,
            url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/link/${row.token}`
        }));

        return NextResponse.json({
            links
        });
    } catch (error: any) {
        console.error('[payment-links/list] Error:', error);

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
