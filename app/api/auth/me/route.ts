import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { getOrCreateUser } from '@/lib/userManagement';

/**
 * API endpoint to get current user data
 * This syncs Privy users with our database
 */
export async function GET(req: NextRequest) {
    try {
        // Get authorization header
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Unauthorized - No token provided' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7);

        // Initialize Privy client
        const privy = new PrivyClient(
            process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
            process.env.PRIVY_APP_SECRET!
        );

        // Verify the token
        const claims = await privy.verifyAuthToken(token);

        // Get full user data from Privy
        const privyUser = await privy.getUser(claims.userId);

        // Sync with our database
        const dbUser = await getOrCreateUser(privyUser);

        return NextResponse.json({
            id: dbUser.id,
            privyId: dbUser.privy_id,
            walletAddress: dbUser.wallet_address,
            email: dbUser.email,
            role: dbUser.role,
            status: dbUser.status,
        });
    } catch (error) {
        console.error('[API] /auth/me error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
