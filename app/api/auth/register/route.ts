import { NextRequest, NextResponse } from 'next/server';
import { createUserFromPrivy } from '@/lib/userManagement';
import { validateBody, registerUserSchema } from '@/lib/validation';

/**
 * POST /api/auth/register
 * Register a new user in the database after Privy authentication
 * This endpoint does NOT require auth (it creates the auth record)
 */
export async function POST(req: NextRequest) {
    try {
        // Validate input (protects against injection)
        const data = await validateBody(req, registerUserSchema);

        // Create user in database
        const user = await createUserFromPrivy({
            privyId: data.privyId,
            walletAddress: data.walletAddress,
            email: data.email,
            authMethod: data.authMethod,
        });

        console.log('[REGISTER SUCCESS]', {
            userId: user.id,
            privyId: user.privy_id,
            timestamp: new Date().toISOString(),
        });

        return NextResponse.json({
            success: true,
            userId: user.id,
        });
    } catch (error: any) {
        console.error('[REGISTER ERROR]', {
            error: error.message,
            timestamp: new Date().toISOString(),
        });

        return NextResponse.json(
            {
                error: 'REGISTRATION_FAILED',
                message: 'Failed to create account. Please try again.',
                // Show validation errors in dev
                ...(process.env.NODE_ENV === 'development' && { details: error.message })
            },
            { status: 500 }
        );
    }
}
