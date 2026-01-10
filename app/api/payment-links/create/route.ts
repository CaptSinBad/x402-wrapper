import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { requireAuth } from '@/lib/auth';
import crypto from 'crypto';

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * POST /api/payment-links/create
 * Create a new payment link with optional product image
 */
export async function POST(req: NextRequest) {
    try {
        const user = await requireAuth(req);

        // Parse FormData
        const formData = await req.formData();

        const name = formData.get('name') as string;
        const description = formData.get('description') as string || '';
        const price = formData.get('price') as string;
        const currency = formData.get('currency') as string;
        const network = formData.get('network') as string;
        const brandColor = formData.get('brandColor') as string || '#2B5FA5';
        const successUrl = formData.get('successUrl') as string || '';
        const cancelUrl = formData.get('cancelUrl') as string || '';
        const collectEmail = formData.get('collectEmail') === 'true';
        const collectName = formData.get('collectName') === 'true';
        const expiresAt = formData.get('expiresAt') as string || null;
        const imageFile = formData.get('image') as File | null;

        if (!name || !price) {
            return NextResponse.json(
                { error: 'name_and_price_required' },
                { status: 400 }
            );
        }

        // Generate unique token
        const token = crypto.randomBytes(12).toString('base64url');

        // Handle image upload if provided
        let imageUrl = null;
        if (imageFile) {
            try {
                // Use Vercel Blob for serverless image storage
                const { put } = await import('@vercel/blob');

                // Generate unique filename
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `payment-links/${token}.${fileExt}`;

                // Upload to Vercel Blob
                const blob = await put(fileName, imageFile, {
                    access: 'public',
                });

                imageUrl = blob.url;
            } catch (err) {
                console.error('Failed to upload image:', err);
                // Continue without image
            }
        }

        // Get user's project for x402 configuration
        const projectResult = await pgPool.query(
            `SELECT id, public_key, x402_tenant_id, x402_network 
             FROM projects 
             WHERE user_id = $1 
             ORDER BY created_at DESC 
             LIMIT 1`,
            [user.id]
        );

        if (projectResult.rows.length === 0) {
            return NextResponse.json(
                { error: 'no_project_found', message: 'Please create a project first' },
                { status: 400 }
            );
        }

        const project = projectResult.rows[0];

        // Convert price to atomic units (USDC has 6 decimals)
        const priceFloat = parseFloat(price);
        const priceCents = Math.round(priceFloat * 100);

        // Store payment link
        const result = await pgPool.query(
            `INSERT INTO payment_links (
                token, seller_id, price_cents, currency, network, metadata, expires_at, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            RETURNING *`,
            [
                token,
                `project-${project.id}`,  // Match the format expected by stats query
                priceCents,
                currency,
                network,
                JSON.stringify({
                    name,
                    description,
                    imageUrl,
                    brandColor,
                    successUrl,
                    cancelUrl,
                    collectEmail,
                    collectName,
                    x402TenantId: project.x402_tenant_id,
                    x402Network: project.x402_network,
                    projectId: project.id,
                }),
                expiresAt || null
            ]
        );

        const paymentLink = result.rows[0];

        return NextResponse.json({
            success: true,
            token,
            url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/link/${token}`,
            paymentLink: {
                id: paymentLink.id,
                token: paymentLink.token,
                name,
                price: priceFloat,
                currency,
                network,
                imageUrl,
                createdAt: paymentLink.created_at,
            }
        });
    } catch (error: any) {
        console.error('[payment-links/create] Error:', error);

        if (error.message === 'Unauthorized') {
            return NextResponse.json(
                { error: 'unauthorized' },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { error: error.message, message: error.message }, // EXPOSE ERROR FOR DEBUGGING
            { status: 500 }
        );
    }
}
