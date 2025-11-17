import type { NextApiRequest, NextApiResponse } from 'next';
import QRCode from 'qrcode';

type ResponseData = 
  | { dataUrl: string }
  | { error: string };

/**
 * QR Code generation endpoint for payment links.
 * Generates a QR code image as a data URL that links to the payment page.
 * 
 * Query params:
 * - token: payment link token (required)
 * - size: QR code size in pixels, default 300
 * 
 * Returns: JSON with dataUrl (base64 encoded PNG image)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, size = '300' } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid token parameter' });
  }

  try {
    const sizeNum = Math.min(Math.max(parseInt(size as string, 10) || 300, 50), 1000); // Clamp between 50-1000px
    
    // Build the full URL to the payment link page
    const protocol = process.env.NODE_ENV === 'production' 
      ? 'https' 
      : 'http';
    const host = req.headers.host || 'localhost:3000';
    const linkUrl = `${protocol}://${host}/link/${token}`;

    // Generate QR code as data URL (PNG)
    const dataUrl = await QRCode.toDataURL(linkUrl, {
      width: sizeNum,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    return res.status(200).json({ dataUrl });
  } catch (error) {
    console.error('QR code generation error', error);
    return res.status(500).json({ error: 'Failed to generate QR code' });
  }
}
