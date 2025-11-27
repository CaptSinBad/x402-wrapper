import { NextRequest, NextResponse } from 'next/server';
import { destroySession } from '../../../../lib/session';

/**
 * POST /api/auth/logout
 * Logout user and destroy session
 */
export async function POST(req: NextRequest) {
    try {
        await destroySession();

        return NextResponse.json({
            success: true,
        });
    } catch (error: any) {
        console.error('[auth/logout] Error:', error);
        return NextResponse.json(
            { error: 'internal_error', message: error.message },
            { status: 500 }
        );
    }
}
