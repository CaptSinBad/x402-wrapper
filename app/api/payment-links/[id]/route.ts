import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { requireAuth } from '../../../../../lib/session';

const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * PATCH /api/payment-links/[id]
 * Update a payment link
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth();
        const { id } = params;
        const body = await req.json();

        const { name, description, price, brandColor, expiresAt } = body;

        // Get existing link to update metadata
        const existingResult = await pgPool.query(
            `SELECT * FROM payment_links WHERE id = $1 AND seller_id = $2`,
            [id, user.id]
        );

        if (existingResult.rows.length === 0) {
            return NextResponse.json(
                { error: 'not_found', message: 'Payment link not found or unauthorized' },
                { status: 404 }
            );
        }

        const existing = existingResult.rows[0];
        const currentMetadata = typeof existing.metadata === 'string'
            ? JSON.parse(existing.metadata)
            : existing.metadata || {};

        // Update metadata
        const updatedMetadata = {
            ...currentMetadata,
            ...(name && { name }),
            ...(description !== undefined && { description }),
            ...(brandColor && { brandColor }),
        };

        // Update payment link
        const priceCents = price ? Math.round(parseFloat(price) * 100) : existing.price_cents;

        const result = await pgPool.query(
            `UPDATE payment_links 
             SET price_cents = $1, 
                 metadata = $2,
                 expires_at = $3,
                 updated_at = NOW()
             WHERE id = $4 AND seller_id = $5
             RETURNING *`,
            [priceCents, JSON.stringify(updatedMetadata), expiresAt || existing.expires_at, id, user.id]
        );

        return NextResponse.json({ success: true, link: result.rows[0] });
    } catch (error: any) {
        console.error('[payment-links/update] Error:', error);

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

/**
 * DELETE /api/payment-links/[id]
 * Delete a payment link
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth();
        const { id } = params;

        // Verify ownership and delete
        const result = await pgPool.query(
            `DELETE FROM payment_links 
             WHERE id = $1 AND seller_id = $2
             RETURNING id`,
            [id, user.id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: 'not_found', message: 'Payment link not found or unauthorized' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[payment-links/delete] Error:', error);

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
