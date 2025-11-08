import type { NextApiRequest } from 'next';

export function parseBearer(header?: string | string[] | null): string | null {
  if (!header) return null;
  const h = Array.isArray(header) ? header[0] : header;
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

export function getAuthToken(req: NextApiRequest): string | null {
  // 1) Authorization header
  const tokenFromHeader = parseBearer(req.headers.authorization as any || req.headers.Authorization as any);
  if (tokenFromHeader) return tokenFromHeader;

  // 2) common cookie names
  const cookies: Record<string, any> = (req.cookies as any) || {};
  const cookieCandidates = ['privy-id-token', 'privy_id_token', 'privyToken'];
  for (const name of cookieCandidates) {
    const v = cookies[name];
    if (v && typeof v === 'string' && v.trim().length > 0) return v.trim();
  }

  // 3) fallback: x-auth-token header
  const alt = (req.headers['x-auth-token'] as string) || undefined;
  if (alt && alt.trim()) return alt.trim();

  return null;
}

export default getAuthToken;
