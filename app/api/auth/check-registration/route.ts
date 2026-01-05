import { NextRequest, NextResponse } from 'next/server';
import { getUserByPrivyId } from '@/lib/userManagement';

/**
 * POST /api/auth/check-registration
 * Check if a Privy user is registered in our database
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

        // Check if user exists in database
        const user = await getUserByPrivyId(privyId);

        if (user) {
            return NextResponse.json({
                registered: true,
                userId: user.id,
            });
        } else {
            return NextResponse.json({
                registered: false,
                userId: null,
            });
        }
    } catch (error) {
        console.error('[API] Check registration error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
