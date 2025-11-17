import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// Since this is a Next.js API route, we'll test the handler directly
describe('QR Code endpoint', () => {
  it('should be a valid API file', () => {
    const qrPath = path.join(process.cwd(), 'apps/dashboard/pages/api/qr.ts');
    expect(fs.existsSync(qrPath)).toBe(true);
  });

  it('should export a default handler function', async () => {
    const handler = (await import('../apps/dashboard/pages/api/qr')).default;
    expect(typeof handler).toBe('function');
  });
});
