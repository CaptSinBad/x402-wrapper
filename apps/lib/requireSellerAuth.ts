import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import { verifyPrivySession } from './verifyPrivySession';
import getAuthToken from './auth';

type WithAuthReq = NextApiRequest & { authUser?: any; sellerWallet?: string };

export function requireAuth(handler: NextApiHandler): NextApiHandler {
  return async function wrapped(req: NextApiRequest, res: NextApiResponse) {
  const token = getAuthToken(req);
  if (!token) return res.status(401).json({ error: 'Missing auth token' });

  const user = await verifyPrivySession(token);
    if (!user) return res.status(401).json({ error: 'Invalid token' });

    const r = req as WithAuthReq;
    r.authUser = user;
    return handler(r, res);
  };
}

export function requireSellerAuth(handler: NextApiHandler): NextApiHandler {
  return requireAuth(async (req: NextApiRequest, res: NextApiResponse) => {
    const r = req as WithAuthReq;
    const sellerWallet = (r.authUser as any)?.wallet?.address;
    if (!sellerWallet) return res.status(400).json({ error: 'User has no wallet address' });
    r.sellerWallet = String(sellerWallet).toLowerCase();
    return handler(r, res);
  });
}

export default requireSellerAuth;
