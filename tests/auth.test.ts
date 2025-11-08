import { describe, it, expect } from 'vitest';
import { parseBearer, getAuthToken } from '../apps/lib/auth';

describe('auth token extraction', () => {
  it('parses Bearer header', () => {
    expect(parseBearer('Bearer abc.def.ghi')).toBe('abc.def.ghi');
    expect(parseBearer('bearer token123')).toBe('token123');
  });

  it('returns null for missing header', () => {
    expect(parseBearer(null as any)).toBeNull();
    expect(parseBearer(undefined)).toBeNull();
    expect(parseBearer('')).toBeNull();
  });

  it('getAuthToken prefers Authorization header then cookies then x-auth-token', () => {
    const req: any = { headers: { authorization: 'Bearer h1' }, cookies: { 'privy-id-token': 'c1' } };
    expect(getAuthToken(req)).toBe('h1');

    const req2: any = { headers: {}, cookies: { 'privy-id-token': 'c2' } };
    expect(getAuthToken(req2)).toBe('c2');

    const req3: any = { headers: { 'x-auth-token': 'x1' }, cookies: {} };
    expect(getAuthToken(req3)).toBe('x1');

    const req4: any = { headers: {}, cookies: {} };
    expect(getAuthToken(req4)).toBeNull();
  });
});
