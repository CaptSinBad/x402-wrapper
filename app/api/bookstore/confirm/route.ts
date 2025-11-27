import { NextRequest, NextResponse } from 'next/server';
import { verify } from '../../../../core/facilitator';
import { Pool } from 'pg';

// Initialize Postgres pool
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

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
              resource: 'http://localhost:3000/bookstore-demo',
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

    // Handle both Privy's useX402Fetch format and custom format
    let paymentPayload, paymentRequirements;

    if (paymentData.paymentPayload && paymentData.paymentRequirements) {
      // Custom format: {paymentPayload, paymentRequirements}
      ({ paymentPayload, paymentRequirements } = paymentData);
    } else if (paymentData.scheme && paymentData.payload) {
      // Privy's useX402Fetch format: {scheme, network, payload}
      paymentPayload = {
        x402Version: 1,
        scheme: paymentData.scheme,
        network: paymentData.network,
        payload: paymentData.payload
      };
      // Reconstruct payment requirements from the initial 402 response
      const body = await req.json();
      const total = body.total || 0;
      const priceAtomic = (total * 1e6).toString();

      paymentRequirements = {
        scheme: 'exact',
        network: 'base-sepolia',
        maxAmountRequired: priceAtomic,
        resource: 'http://localhost:3000/bookstore-demo',
        description: `Bookstore Purchase - ${total.toFixed(2)} USDC`,
        mimeType: 'application/json',
        maxTimeoutSeconds: 300,
        asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        payTo: process.env.NEXT_PUBLIC_SELLER_ADDRESS || '0x784590bfCad59C0394f91F1CD1BCBA1e51d09408',
        extra: {
          name: 'USDC',
          version: '2',
        },
      };
    } else {
      console.error('[bookstore/confirm] Invalid payment data format:', paymentData);
      return NextResponse.json(
        { error: 'invalid_payment_format' },
        { status: 400 }
      );
    }

    console.log('[bookstore/confirm] paymentPayload.payload.authorization:', JSON.stringify(paymentPayload?.payload?.authorization, null, 2));
    console.log('[bookstore/confirm] Settling payment with CDP facilitator...');
    console.log('[bookstore/confirm] Payment Payload:', JSON.stringify(paymentPayload, null, 2));
    console.log('[bookstore/confirm] Payment Requirements:', JSON.stringify(paymentRequirements, null, 2));

    // Settle payment with Coinbase CDP facilitator (replaces verify + returns tx hash)
    const { settleCDPPayment } = await import('../../../../lib/cdp-facilitator');

    const settlementResult = await settleCDPPayment({
      paymentPayload,
      paymentRequirements,
      apiKeyName: process.env.CDP_API_KEY_ID!,
      apiKeySecret: process.env.CDP_API_KEY_SECRET!,
      facilitatorUrl: process.env.NEXT_PUBLIC_FACILITATOR_URL || 'https://api.cdp.coinbase.com/platform',
    });

    console.log('[bookstore/confirm] Settlement result:', settlementResult);

    if (!settlementResult.success) {
      console.error('[bookstore/confirm] Payment settlement failed:', settlementResult.errorReason);
      return NextResponse.json(
        {
          error: 'payment_settlement_failed',
          errorReason: settlementResult.errorReason,
        },
        { status: 402 }
      );
    }

    console.log('[bookstore/confirm] Payment settled successfully with tx hash:', settlementResult.transaction);

    // Create sale record in database using Postgres
    const amountUsdc = parseFloat((parseInt(paymentRequirements.maxAmountRequired) / 1e6).toFixed(2));
    const amountCents = Math.round(amountUsdc * 100); // Convert USDC to cents

    const result = await pgPool.query(
      `INSERT INTO sales(seller_id, amount_cents, currency, purchaser_address, metadata, created_at)
       VALUES($1, $2, $3, $4, $5, NOW()) RETURNING *`,
      [
        'bookstore-demo', // seller_id
        amountCents,
        'USDC',
        settlementResult.payer,
        JSON.stringify({
          status: 'completed',
          transaction_hash: settlementResult.transaction || null,
          network: settlementResult.network
        }),
      ]
    );

    if (!result.rows || result.rows.length === 0) {
      console.error('[bookstore/confirm] Database error: No rows returned');
      return NextResponse.json(
        { error: 'database_error', details: 'Failed to create sale record' },
        { status: 500 }
      );
    }

    const sale = result.rows[0];
    console.log('[bookstore/confirm] Sale recorded:', sale);

    return NextResponse.json({
      success: true,
      saleId: sale.id,
      amount: amountUsdc.toFixed(2),
      payer: settlementResult.payer,
      txHash: settlementResult.transaction,
      network: settlementResult.network,
    });
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
