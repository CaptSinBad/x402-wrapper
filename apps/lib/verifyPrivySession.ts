/**
 * verifyPrivySession.ts
 * Works across all stable @privy-io/server-auth versions
 */

import { PrivyClient } from '@privy-io/server-auth';

/**
 * Verify Privy authentication token.
 * @param token Bearer token from client (Authorization header)
 * @returns verified.user or null if invalid
 */
export async function verifyPrivySession(token?: string) {
  if (!token) return null;

  try {
  // Create a Privy client using server-side credentials. These must be set in
  // your environment (do NOT expose the app secret to the browser).
  const appId = process.env.PRIVY_APP_ID || process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;

  if (!appId || !appSecret) {
    console.error('Privy credentials are not configured (PRIVY_APP_ID / PRIVY_APP_SECRET)');
    return null;
  }

  const client = new PrivyClient(appId, appSecret);
  const verified = await client.verifyAuthToken(token);
  return (verified as any).user;
  } catch (err) {
    console.error('❌ Privy token verification failed:', err);
    return null;
  }
}
