import { NextRequest, NextResponse } from 'next/server';
import { generateSiweMessage, verifySiweSignature } from '@/lib/auth/siwe';
import { createToken } from '@/lib/auth/jwt';
import { query } from '@/lib/db';
import { cookies } from 'next/headers';
import { consumeNonce } from '../challenge/route';

/**
 * POST /api/auth/signin
 * Sign in with Ethereum (SIWE) - verify signature and create session
 */
export async function POST(req: NextRequest) {
    try {
        const { message, signature, address } = await req.json();

        if (!message || !signature || !address) {
            return NextResponse.json(
                { error: 'missing_fields', message: 'Message, signature, and address are required' },
                { status: 400 }
            );
        }

        // Verify the signature
        const verificationResult = await verifySiweSignature(message, signature);

        if (!verificationResult.success) {
            return NextResponse.json(
                { error: 'invalid_signature', message: verificationResult.error || 'Invalid signature' },
                { status: 401 }
            );
        }

        const walletAddress = verificationResult.address!;

        // Verify address matches what was requested
        if (walletAddress.toLowerCase() !== address.toLowerCase()) {
            return NextResponse.json(
                { error: 'address_mismatch', message: 'Signature address does not match' },
                { status: 401 }
            );
        }

        // Optional: Verify nonce was used (prevents replay attacks)
        // In production, you should verify the nonce from the message matches stored nonce
        // const storedNonce = consumeNonce(walletAddress);
        // if (!storedNonce) {
        //     return NextResponse.json(
        //         { error: 'invalid_nonce', message: 'Invalid or expired nonce' },
        //         { status: 401 }
        //     );
        // }

        // Check if user exists, create if not
        let user = await query(
            `SELECT * FROM users WHERE wallet_address = $1`,
            [walletAddress]
        );

        if (user.rows.length === 0) {
            // Create new user
            const result = await query(
                `INSERT INTO users (wallet_address, auth_method) 
                 VALUES ($1, $2) 
                 RETURNING *`,
                [walletAddress, 'wallet']
            );
            user = result;
        }

        const userId = user.rows[0].id;

        // Create JWT token
        const token = await createToken({
            userId,
            walletAddress,
            authMethod: 'wallet',
        });

        // Set HTTP-only cookie
        const cookieStore = await cookies();
        cookieStore.set('session_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60, // 7 days
            path: '/',
        });

        // Check onboarding status
        const onboarding = await query(
            `SELECT completed FROM onboarding_progress WHERE user_id = $1`,
            [userId]
        );

        const needsOnboarding = onboarding.rows.length === 0 || !onboarding.rows[0].completed;

        return NextResponse.json({
            success: true,
            user: {
                id: user.rows[0].id,
                walletAddress: user.rows[0].wallet_address,
                authMethod: user.rows[0].auth_method,
            },
            needsOnboarding,
            redirectTo: needsOnboarding ? '/onboarding/step-1' : '/dashboard',
        });
    } catch (error: any) {
        console.error('[auth/signin] Error:', error);
        return NextResponse.json(
            { error: 'internal_error', message: error.message },
            { status: 500 }
        );
    }
}
