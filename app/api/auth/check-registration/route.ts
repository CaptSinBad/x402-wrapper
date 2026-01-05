import { NextRequest, NextResponse } from 'next/server';

/**
 * TEMPORARY: Bypass database check - treat all users as new
 * This gets login working while we debug the database connection
 */
export async function POST(req: NextRequest) {
    try {
        const { privyId, walletAddress, email } = await req.json();

        if (!privyId) {
            return NextResponse.json(
                { error: 'Privy ID required' },
                { status: 400 }
            );
        }

        // TEMPORARY: Always return NOT registered to trigger signup flow
        // This bypasses the database entirely
        return NextResponse.json({
            registered: false,
            userId: null,
        });
    } catch (error) {
        console.error('[API] Check registration error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
