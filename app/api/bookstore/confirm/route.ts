import { NextRequest, NextResponse } from 'next/server';
import { verify } from '../../../../core/facilitator';

/**
 * POST /api/bookstore/confirm
 * Bookstore payment confirmation endpoint
 * Protected by x402 payment middleware
 * Called after wallet signs the payment
 */
export async function POST(req: NextRequest) {
  try {
    // Extract the payment header
    const paymentHeader = req.headers.get('x-payment');
    
    if (!paymentHeader) {
      console.error('[bookstore/confirm] Missing X-PAYMENT header');
      return NextResponse.json(
        {
          error: 'payment_required',
          message: 'X-PAYMENT header required',
        },
        { status: 402 }
      );
    }

    // Decode the payment header
    let paymentData;
    try {
      console.log('[bookstore/confirm] Decoding payment header...');
      paymentData = JSON.parse(Buffer.from(paymentHeader, 'base64').toString());
      console.log('[bookstore/confirm] Decoded header successfully');
    } catch (err) {
      console.error('[bookstore/confirm] Failed to decode payment header:', err);
      return NextResponse.json(
        { error: 'invalid_payment_header', details: String(err) },
        { status: 400 }
      );
    }

    const { paymentPayload, paymentRequirements } = paymentData;
    console.log('[bookstore/confirm] Verifying payment with facilitator...');

    // Verify payment with facilitator
    const verifyRes = await verify({
      paymentPayload,
      paymentRequirements,
    });

    console.log('[bookstore/confirm] Verification result:', verifyRes);

    if (!verifyRes.isValid) {
      console.error('[bookstore/confirm] Payment verification failed:', verifyRes.invalidReason);
      return NextResponse.json(
        {
          error: 'payment_verification_failed',
          invalidReason: verifyRes.invalidReason,
        },
        { status: 402 }
      );
    }

    // Payment verified! Return the protected resource (order confirmation)
    const body = await req.json().catch(() => ({}));
    const { items, total } = body;

    console.log('[bookstore/confirm] Payment verified! Creating order...');
    return NextResponse.json(
      {
        success: true,
        orderId: `ORDER-${Date.now()}`,
        items,
        total,
        message: 'Thank you for your purchase!',
        txHash: verifyRes.txHash,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('[bookstore/confirm] Error:', err);
    return NextResponse.json(
      {
        error: 'internal_error',
        message: err?.message || 'Payment verification failed',
        details: String(err),
      },
      { status: 500 }
    );
  }
}
