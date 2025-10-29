import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyPrivySession } from '../../../lib/verifyPrivySession';

// Server-only endpoint to verify a Privy auth token.
// Usage: call with `Authorization: Bearer <token>` header.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || typeof authHeader !== 'string') {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) return res.status(401).json({ error: 'Missing token' });

  // Ensure server-side Privy credentials are configured
  if (!process.env.PRIVY_APP_ID || !process.env.PRIVY_APP_SECRET) {
    console.error('Privy env vars missing: PRIVY_APP_ID / PRIVY_APP_SECRET');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  try {
    const user = await verifyPrivySession(token);

    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Return limited user info — don't leak sensitive fields
    return res.status(200).json({ user });
  } catch (err) {
    console.error('verify endpoint error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
