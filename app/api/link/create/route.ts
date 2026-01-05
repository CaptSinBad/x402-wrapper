import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import crypto from 'crypto';

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * POST /api/link/create
 * Create a new payment link for merchants
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            productName,
            description,
            priceUSD,
            sellerId,
            sellerWallet,
            expiresInHours,
            metadata
        } = body;

        // Validate required fields
        if (!productName || !priceUSD) {
            return NextResponse.json(
                { error: 'missing_required_fields', message: 'productName and priceUSD are required' },
                { status: 400 }
            );
        }

        // Generate unique token (8 characters, URL-safe)
        const token = crypto.randomBytes(6).toString('base64url').substring(0, 8);

        // Convert USD to cents
        const priceCents = Math.round(parseFloat(priceUSD) * 100);

        // Calculate expiration
        const expiresAt = expiresInHours
            ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
            : null;

        // Use provided seller wallet or default
        const wallet = sellerWallet || process.env.NEXT_PUBLIC_SELLER_ADDRESS || '0x784590bfCad59C0394f91F1CD1BCBA1e51d09408';

        // Insert payment link into database
        const result = await pgPool.query(
            `INSERT INTO payment_links (
        token,
        seller_id,
        price_cents,
        currency,
        network,
        expires_at,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
            [
                token,
                sellerId || null, // Use null if no seller ID provided
                priceCents,
                'USD',
                'base-sepolia',
                expiresAt,
                JSON.stringify({
                    productName,
                    description,
                    sellerWallet: wallet,
                    ...metadata
                })
            ]
        );

        const link = result.rows[0];

        // Generate full URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const linkUrl = `${baseUrl}/link/${token}`;

        // Generate QR code (base64 data URL)
        const QRCode = require('qrcode');
        const qrCodeDataUrl = await QRCode.toDataURL(linkUrl, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        });

        return NextResponse.json({
            success: true,
            token,
            url: linkUrl,
            qrCode: qrCodeDataUrl,
            link: {
                id: link.id,
                token: link.token,
                productName,
                description,
                priceUSD,
                priceCents,
                expiresAt: link.expires_at,
                createdAt: link.created_at
            }
        });
    } catch (error: any) {
        console.error('[link/create] Error:', error);

        // Handle duplicate token (very unlikely with crypto.randomBytes)
        if (error.code === '23505') {
            // Retry with new token
            return NextResponse.json(
                { error: 'token_collision', message: 'Please try again' },
                { status: 500 }
            );
        }

        return NextResponse.json(
            { error: 'internal_error', message: error.message },
            { status: 500 }
        );
    }
}
