import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * POST /api/seller_endpoints
 * Register a new seller endpoint for API monetization
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { endpointUrl, price, currency, scheme, network, facilitatorUrl, metadata } = body;

        // Validate required fields
        if (!endpointUrl || !price) {
            return NextResponse.json(
                { error: 'missing_required_fields', message: 'endpointUrl and price are required' },
                { status: 400 }
            );
        }

        // TODO: Get seller wallet from authenticated user session
        // For now, using a default seller wallet
        const sellerWallet = process.env.NEXT_PUBLIC_SELLER_ADDRESS || '0x784590bfCad59C0394f91F1CD1BCBA1e51d09408';

        // Convert price from USDC to atomic units (6 decimals)
        const priceAtomic = Math.round(parseFloat(price) * 1000000);

        // Insert endpoint into database
        const result = await pgPool.query(
            `INSERT INTO seller_endpoints (
        seller_wallet,
        endpoint_url,
        price,
        currency,
        scheme,
        network,
        facilitator_url,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
            [
                sellerWallet,
                endpointUrl,
                priceAtomic,
                currency || 'USDC',
                scheme || 'exact',
                network || 'base-sepolia',
                facilitatorUrl || process.env.NEXT_PUBLIC_FACILITATOR_URL,
                JSON.stringify(metadata || {})
            ]
        );

        const endpoint = result.rows[0];

        return NextResponse.json({
            success: true,
            endpoint: {
                id: endpoint.id,
                endpointUrl: endpoint.endpoint_url,
                price: (endpoint.price / 1000000).toFixed(2),
                currency: endpoint.currency,
                scheme: endpoint.scheme,
                network: endpoint.network,
            }
        });
    } catch (error: any) {
        console.error('[seller_endpoints] Error:', error);

        // Handle duplicate endpoint URL
        if (error.code === '23505') {
            return NextResponse.json(
                { error: 'duplicate_endpoint', message: 'This endpoint URL is already registered' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: 'internal_error', message: error.message },
            { status: 500 }
        );
    }
}

/**
 * GET /api/seller_endpoints
 * List all seller endpoints
 */
export async function GET() {
    try {
        const result = await pgPool.query(
            `SELECT * FROM seller_endpoints ORDER BY created_at DESC`
        );

        const endpoints = result.rows.map(endpoint => ({
            id: endpoint.id,
            sellerWallet: endpoint.seller_wallet,
            endpointUrl: endpoint.endpoint_url,
            priceUSDC: (endpoint.price / 1000000).toFixed(2),
            currency: endpoint.currency,
            scheme: endpoint.scheme,
            network: endpoint.network,
            createdAt: endpoint.created_at,
        }));

        return NextResponse.json({ endpoints });
    } catch (error: any) {
        console.error('[seller_endpoints] Error:', error);
        return NextResponse.json(
            { error: 'internal_error', message: error.message },
            { status: 500 }
        );
    }
}
