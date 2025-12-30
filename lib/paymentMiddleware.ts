import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import { verify as facilitatorVerify } from '../core/facilitator';

type WithPaymentReq = NextApiRequest & { paymentVerify?: any };

export function requirePayment(handler: NextApiHandler): NextApiHandler {
  return async function wrapped(req: NextApiRequest, res: NextApiResponse) {
    const r = req as WithPaymentReq;

    const xPaymentHeader = req.headers['x-payment'] as string | undefined;
    const activationCodeHeader = (req.headers['x-activation-code'] || req.headers['x-activation']) as string | undefined;
    if (!xPaymentHeader) {
      // Respond with payment requirements for client to act on.
      const paymentRequirements = {
        x402Version: 1,
        accepts: [
          {
            scheme: 'exact',
            network: 'base',
            maxAmountRequired: '1000000',
            resource: req.url || '/',
            description: 'Protected resource (demo)',
            mimeType: 'application/json',
            payTo: '0x0000000000000000000000000000000000000000',
            facilitatorUrl: '/api/facilitator/verify',
            asset: 'USDC',
            extra: {},
          },
        ],
      };

      res.status(402).json(paymentRequirements);
      return;
    }

    // If an activation code header is present, attempt to redeem and allow access
    if (activationCodeHeader) {
      try {
        // activation code header may be a plain code or base64 JSON { code, buyer }
        let code = activationCodeHeader;
        let buyer: string | undefined;
        try {
          const decoded = Buffer.from(activationCodeHeader, 'base64').toString('utf8');
          const parsed = JSON.parse(decoded);
          if (parsed && parsed.code) {
            code = parsed.code;
            buyer = parsed.buyer || parsed.buyer_address || undefined;
          }
        } catch (_) {
          // not JSON/base64, treat header as raw code
        }

        // Use centralized query
        const { query } = await import('./db');

        // Check if activation code exists and is not used
        const checkResult = await query(
          `SELECT * FROM activation_codes WHERE code = $1 AND used = false`,
          [code]
        );

        if (checkResult.rows.length === 0) {
          return res.status(402).json({ isValid: false, invalidReason: 'activation_code_invalid_or_used' });
        }

        const activationCode = checkResult.rows[0];

        // Mark as used
        await query(
          `UPDATE activation_codes SET used = true, used_by = $1, used_at = NOW() WHERE code = $2`,
          [buyer || null, code]
        );

        // attach a fake verify result to allow downstream handlers
        r.paymentVerify = { isValid: true, payer: buyer || activationCode.buyer_address || null, activationCode };
        return handler(r, res);
      } catch (err) {
        console.error('activation code middleware error', err);
        return res.status(500).json({ error: 'activation_code_error', detail: String(err) });
      }
    }

    // Decode header (expected base64 JSON) and call facilitator.verify
    try {
      const decoded = Buffer.from(xPaymentHeader, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);

      // Call facilitator verify endpoint (core client). If FACILITATOR_URL not configured,
      // the core client will throw — we propagate a 500 so developers can notice.
      const verifyResp = await facilitatorVerify(parsed as any);
      if (!verifyResp || verifyResp.isValid !== true) {
        // Return 402 with the same shape so clients can attempt payment again
        res.status(402).json({ isValid: false, invalidReason: verifyResp?.invalidReason ?? 'payment_required' });
        return;
      }

      // Attach verification result and continue to handler
      r.paymentVerify = verifyResp;
      return handler(r, res);
    } catch (err) {
      console.error('payment middleware error', err);
      return res.status(500).json({ error: 'payment_middleware_error', detail: String(err) });
    }
  };
}

export default requirePayment;
