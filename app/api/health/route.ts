import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';

export async function GET() {
  try {
    const start = Date.now();
    const result = await db.query('SELECT NOW()');
    const duration = Date.now() - start;

    return NextResponse.json({
      status: 'healthy',
      timestamp: result.rows[0].now,
      latency: `${duration}ms`,
      env: process.env.NODE_ENV,
      database_url_configured: !!process.env.DATABASE_URL
    });
  } catch (error: any) {
    console.error('Health Check Failed:', error);
    return NextResponse.json({
      status: 'unhealthy',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
