import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth, formatApiError } from '../../../../../lib/apiAuth';
import crypto from 'crypto';

/**
 * POST /api/v1/test/checkout-session
 * Create a test checkout session with mock data for development
 */
export async function POST(req: NextRequest) {
    try {
        // Authenticate merchant
        const auth = await requireApiAuth(req);

        // Create a test session with mock data
        const testSession = {
            id: `cs_test_${crypto.randomBytes(12).toString('base64url')}`,
            object: 'checkout.session',
            amount_total: 1000, // $10.00
            currency: 'USDC',
            customer_email: 'test@example.com',
            expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour
            metadata: { test: true },
            mode: 'payment',
            payment_status: 'unpaid',
            status: 'open',
            success_url: 'https://example.com/success',
            cancel_url: 'https://example.com/cancel',
            url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout/test`,
            created: new Date().toISOString(),
        };

        return NextResponse.json(testSession);
    } catch (error: any) {
        console.error('[v1/test/checkout-session] Error:', error);

        const { error: formattedError, status } = formatApiError(error);
        return NextResponse.json(formattedError, { status });
    }
}
