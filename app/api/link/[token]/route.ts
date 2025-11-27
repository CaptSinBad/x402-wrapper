import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Return a payment link by token. This is used by the public link resolver
// and the POS page. We enrich the link with item or endpoint metadata when available.
export async function GET(_: Request, context: { params: Promise<{ token: string }> }) {
  const params = await context.params;
  try {
    const token = params.token;
    if (!token) return NextResponse.json({ error: 'missing_token' }, { status: 400 });

    // Fetch payment link
    const linkResult = await pgPool.query(
      `SELECT * FROM payment_links WHERE token = $1`,
      [token]
    );

    if (linkResult.rows.length === 0) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const link = linkResult.rows[0];

    // Enrich with item or endpoint details when possible
    let item: any = null;
    let endpoint: any = null;

    try {
      if (link.item_id) {
        const itemResult = await pgPool.query(
          `SELECT * FROM store_items WHERE id = $1`,
          [link.item_id]
        );
        if (itemResult.rows.length > 0) {
          item = itemResult.rows[0];
        }
      }
    } catch (e) { /* ignore */ }

    try {
      if (link.endpoint_id) {
        const endpointResult = await pgPool.query(
          `SELECT * FROM seller_endpoints WHERE id = $1`,
          [link.endpoint_id]
        );
        if (endpointResult.rows.length > 0) {
          endpoint = endpointResult.rows[0];
        }
      }
    } catch (e) { /* ignore */ }

    return NextResponse.json({ link: { ...link, item, endpoint } });
  } catch (err: any) {
    console.error('link route error', err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
