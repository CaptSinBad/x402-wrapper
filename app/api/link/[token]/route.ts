import { NextResponse } from 'next/server';

// Return a payment link by token. This is used by the public link resolver
// and the POS page. We enrich the link with item or endpoint metadata when available.
export async function GET(_: Request, context: { params: any }) {
  const { params } = context;
  try {
    const token = params.token;
    if (!token) return NextResponse.json({ error: 'missing_token' }, { status: 400 });

    const db = await import('../../../../apps/lib/dbClient');
    const link = await db.getPaymentLinkByToken(token);
    if (!link) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    // enrich with item or endpoint details when possible
    let item: any = null;
    let endpoint: any = null;
    try {
      if (link.item_id) {
        item = await db.getStoreItemById(link.item_id);
      }
    } catch (e) { /* ignore */ }
    try {
      if (link.endpoint_id) {
        endpoint = await db.getSellerEndpointById(link.endpoint_id);
      }
    } catch (e) { /* ignore */ }

    return NextResponse.json({ link: { ...link, item, endpoint } });
  } catch (err: any) {
    console.error('link route error', err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
