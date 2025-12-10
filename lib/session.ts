// Session management utilities
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { db } from './db';

// Removed local Pool instantiation


export interface SessionUser {
    id: string;
    walletAddress?: string;
    email?: string;
    fullName?: string;
    authMethod: string;
}

export async function createSession(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await db.query(
        `INSERT INTO user_sessions (user_id, token, expires_at) 
     VALUES ($1, $2, $3)`,
        [userId, token, expiresAt]
    );

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('session_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: expiresAt,
        path: '/',
    });

    return token;
}

export async function getSession(): Promise<SessionUser | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;

    if (!token) return null;

    const result = await db.query(
        `SELECT u.* FROM users u
     JOIN user_sessions s ON s.user_id = u.id
     WHERE s.token = $1 AND s.expires_at > NOW()`,
        [token]
    );

    if (result.rows.length === 0) return null;

    const user = result.rows[0];
    return {
        id: user.id,
        walletAddress: user.wallet_address,
        email: user.email,
        fullName: user.full_name,
        authMethod: user.auth_method,
    };
}

export async function destroySession(): Promise<void> {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;

    if (token) {
        await db.query(
            `DELETE FROM user_sessions WHERE token = $1`,
            [token]
        );
    }

    cookieStore.delete('session_token');
}

export async function requireAuth(): Promise<SessionUser> {
    const user = await getSession();

    if (!user) {
        throw new Error('Unauthorized');
    }

    return user;
}
