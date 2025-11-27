import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * GET /api/dashboard/endpoints
 * Returns seller endpoints with sales statistics
 */
export async function GET() {
    try {
        const endpointsResult = await pgPool.query(
            `SELECT 
         e.id,
         e.seller_wallet,
         e.endpoint_url,
         e.price,
         e.currency,
         e.scheme,
         e.network,
         e.metadata,
         e.created_at,
         COUNT(s.id) as sales_count,
         MAX(s.created_at) as last_sale
       FROM seller_endpoints e
       LEFT JOIN sales s ON s.seller_id = 'endpoint-' || e.id::text
       GROUP BY e.id
       ORDER BY e.created_at DESC`
        );

        interface EndpointRow {
            id: number;
            seller_wallet: string;
            endpoint_url: string;
            price: number;
            currency: string;
            scheme: string;
            network: string;
            metadata: any;
            created_at: Date;
            sales_count: string;
            last_sale: Date | null;
        }

        const endpoints = endpointsResult.rows.map((endpoint: EndpointRow) => ({
            id: endpoint.id,
            sellerWallet: endpoint.seller_wallet,
            endpointUrl: endpoint.endpoint_url,
            priceUSDC: (endpoint.price / 1000000).toFixed(2), // Assuming price is in atomic units
            priceCents: Math.round(endpoint.price / 10000), // Convert to cents
            currency: endpoint.currency,
            scheme: endpoint.scheme,
            network: endpoint.network,
            salesCount: parseInt(endpoint.sales_count),
            lastSale: endpoint.last_sale,
            createdAt: endpoint.created_at,
        }));

        return NextResponse.json({ endpoints });
    } catch (error: any) {
        console.error('[dashboard/endpoints] Error:', error);
        return NextResponse.json(
            { error: 'failed_to_fetch_endpoints', details: error.message },
            { status: 500 }
        );
    }
}
