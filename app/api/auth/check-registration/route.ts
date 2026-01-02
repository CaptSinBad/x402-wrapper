import { NextRequest, NextResponse } from 'next/server';
import { getUserByPrivyId } from '@/lib/userManagement';

/**
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

        return NextResponse.json({
            registered: !!user,
            userId: user?.id,
        });
    } catch (error) {
        console.error('[API] Check registration error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
