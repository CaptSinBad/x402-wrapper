import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../lib/session';

/**
 * GET /api/auth/session
 * Get current user session
 */
export async function GET(req: NextRequest) {
    try {
        const user = await getSession();

        if (!user) {
            return NextResponse.json(
                { authenticated: false },
                { status: 401 }
            );
        }

        return NextResponse.json({
            authenticated: true,
            user,
        });
    } catch (error: any) {
        console.error('[auth/session] Error:', error);
        return NextResponse.json(
            { error: 'internal_error', message: error.message },
            { status: 500 }
        );
    }
}
