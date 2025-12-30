// Session management utilities with JWT
import { cookies } from 'next/headers';
import { createToken, verifyToken, JWTPayload } from './auth/jwt';
import { query } from './db';

export interface SessionUser {
    id: string;
    walletAddress?: string;
    email?: string;
    fullName?: string;
    authMethod: string;
}

/**
 * Create a session for a user (sets JWT cookie)
 * 
 * @param userId User ID from database
 * @returns JWT token
 */
export async function createSession(userId: string): Promise<string> {
    // Fetch user data to encode in JWT
    const result = await query(
        `SELECT * FROM users WHERE id = $1`,
        [userId]
    );

    if (result.rows.length === 0) {
        throw new Error('User not found');
    }

    const user = result.rows[0];

    // Create JWT token
    const token = await createToken({
        userId: user.id,
        walletAddress: user.wallet_address,
        authMethod: user.auth_method,
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

    return token;
}

/**
 * Get current session user from JWT cookie
 * 
 * @returns SessionUser or null if not authenticated
 */
export async function getSession(): Promise<SessionUser | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;

    if (!token) return null;

    // Verify and decode JWT
    const payload = await verifyToken(token);

    if (!payload) return null;

    return {
        id: payload.userId,
        walletAddress: payload.walletAddress,
        email: undefined,
        fullName: undefined,
        authMethod: payload.authMethod,
    };
}

/**
 * Destroy current session (delete cookie)
 */
export async function destroySession(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete('session_token');
}

/**
 * Require authentication - throws if not authenticated
 * 
 * @returns SessionUser
 * @throws Error if not authenticated
 */
export async function requireAuth(): Promise<SessionUser> {
    const user = await getSession();

    if (!user) {
        throw new Error('Unauthorized');
    }

    return user;
}
