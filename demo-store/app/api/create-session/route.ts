import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { items } = await req.json();

        // Map cart items to BinahPay line_items
        const lineItems = items.map((item: any) => ({
            product_id: item.product.id,
            quantity: item.quantity,
        }));

        // Create BinahPay checkout session
        const apiKey = process.env.BINAHPAY_API_KEY;
        if (!apiKey) {
            throw new Error('BINAHPAY_API_KEY not configured');
        }

        const response = await fetch('https://x402-wrapper-nld7.vercel.app/api/v1/checkout/sessions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                line_items: lineItems,
                success_url: 'http://localhost:3001/success',
                cancel_url: 'http://localhost:3001',
                metadata: { store: 'rola-accessories' },
            }),
        });

        const session = await response.json();

        if (!response.ok) {
            throw new Error(session.error?.message || 'Failed to create session');
        }

        return NextResponse.json({ sessionId: session.id });
    } catch (error: any) {
        console.error('Session creation error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
