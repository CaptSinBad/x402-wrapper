// Deprecated app-router proxy for admin settlements.
// This route previously attempted to import server helpers using deep relative
// paths and caused module resolution errors during Next dev build. The
// canonical admin pages API lives under `apps/dashboard/pages/api/admin/settlemen`
// (pages API). Keep a small stub here to avoid accidental 404s while we
// standardize on the pages API endpoints.

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'deprecated', message: 'use /api/admin/settlements (pages API) instead' }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({ error: 'deprecated' }, { status: 410 });
}
