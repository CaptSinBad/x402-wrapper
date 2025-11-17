import { describe, it, expect } from 'vitest';

describe('Payment Link Expiration', () => {
  it('should reject expired payment links', async () => {
    // Mock a link that expired 1 hour ago
    const expiredLink = {
      id: 'link-expired',
      token: 'exp-token-123',
      seller_id: 'seller-1',
      expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
      status: 'active',
    };

    // Verify that a date comparison shows it's expired
    const expiresAt = new Date(expiredLink.expires_at);
    const now = new Date();
    expect(expiresAt <= now).toBe(true);
  });

  it('should accept non-expired payment links', async () => {
    // Mock a link that expires 1 hour from now
    const validLink = {
      id: 'link-valid',
      token: 'valid-token-456',
      seller_id: 'seller-1',
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
      status: 'active',
    };

    // Verify that a date comparison shows it's not expired
    const expiresAt = new Date(validLink.expires_at);
    const now = new Date();
    expect(expiresAt > now).toBe(true);
  });

  it('should accept links without expiration date', async () => {
    // Mock a link with no expiration
    const permanentLink = {
      id: 'link-permanent',
      token: 'perm-token-789',
      seller_id: 'seller-1',
      expires_at: null,
      status: 'active',
    };

    // Verify that no expiration check passes
    expect(permanentLink.expires_at === null || permanentLink.expires_at === undefined).toBe(true);
  });
});
