import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const start = Date.now();
    // Simple query to check database connectivity
    const result = await query('SELECT NOW()');
    const duration = Date.now() - start;

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      time: result.rows[0].now,
      latency: `${duration}ms`
    });
  } catch (error: any) {
    console.error('[Health Check] Database error:', error);
    return NextResponse.json({
      status: 'error',
      database: 'disconnected',
      error: error.message
    }, { status: 500 });
  }
}
