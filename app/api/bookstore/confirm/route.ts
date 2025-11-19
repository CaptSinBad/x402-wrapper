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
      console.log('[bookstore/confirm] No X-PAYMENT header - returning payment requirements');
      
      // Parse request body to get total price
      const body = await req.json().catch(() => ({ total: 0 }));
      const total = body.total || 0;
      const priceAtomic = (total * 1e6).toString(); // USDC is 6 decimals
      
      // Return 402 with payment requirements (accepts array)
      // Must include all required fields for facilitator verification
      return NextResponse.json(
        {
          accepts: [
            {
              scheme: 'exact',
              network: 'base-sepolia',
              maxAmountRequired: priceAtomic,
              resource: '/bookstore-demo',
              description: `Bookstore Purchase - ${total.toFixed(2)} USDC`,
              mimeType: 'application/json',
              maxTimeoutSeconds: 300,
              // USDC token address on Base Sepolia
              asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
              payTo: process.env.NEXT_PUBLIC_SELLER_ADDRESS || '0x784590bfCad59C0394f91F1CD1BCBA1e51d09408',
              extra: {
                name: 'USDC',
                version: '2',
              },
            },
          ],
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
      console.log('[bookstore/confirm] Payment data structure:', JSON.stringify(paymentData, null, 2));
    } catch (err) {
      console.error('[bookstore/confirm] Failed to decode payment header:', err);
      return NextResponse.json(
        { error: 'invalid_payment_header', details: String(err) },
        { status: 400 }
      );
    }

    const { paymentPayload, paymentRequirements } = paymentData;
    console.log('[bookstore/confirm] paymentPayload.payload.authorization:', JSON.stringify(paymentPayload?.payload?.authorization, null, 2));
    console.log('[bookstore/confirm] Verifying payment with facilitator...');
    console.log('[bookstore/confirm] Payment Payload:', JSON.stringify(paymentPayload, null, 2));
    console.log('[bookstore/confirm] Payment Requirements:', JSON.stringify(paymentRequirements, null, 2));

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
