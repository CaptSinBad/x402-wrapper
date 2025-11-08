import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { token } = req.query as { token?: string };
  if (!token) return res.status(400).json({ error: 'missing_token' });

  try {
  const db = await import('../../../../lib/dbClient');
    const link = await db.getPaymentLinkByToken(String(token));
    if (!link) return res.status(404).json({ error: 'not_found' });
    return res.status(200).json({ ok: true, link });
  } catch (err: any) {
    console.error('link resolver error', err);
    return res.status(500).json({ error: 'server_error' });
  }
}
