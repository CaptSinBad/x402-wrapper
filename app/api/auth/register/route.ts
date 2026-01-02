import { NextRequest, NextResponse } from 'next/server';
import { createUserFromPrivy } from '@/lib/userManagement';

/**
 * Register a new user in the database
 */
export async function POST(req: NextRequest) {
    try {
        const { privyId, walletAddress, email, authMethod } = await req.json();

        if (!privyId) {
            return NextResponse.json(
                { error: 'Privy ID required' },
                { status: 400 }
            );
        }

        // Create user in database
        const user = await createUserFromPrivy({
            privyId,
            walletAddress,
            email,
            authMethod: authMethod || 'wallet',
        });

        return NextResponse.json({
            success: true,
            userId: user.id,
        });
    } catch (error) {
        console.error('[API] Registration error:', error);
        return NextResponse.json(
            { error: 'Failed to create account' },
            { status: 500 }
        );
    }
}
