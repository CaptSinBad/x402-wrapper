/**
 * Stub session module (auth removed)
 * All functions return null/empty to indicate no authentication
 */

export interface SessionUser {
    id: string;  // Added for compatibility
    userId: string;
    walletAddress: string;
    authMethod: 'wallet' | 'email';
    role?: string;
}

/**
 * Always returns null (no authentication)
 */
export async function getSessionUser(): Promise<SessionUser | null> {
    return null;
}

/**
 * Always returns null (no authentication)
 */
export async function requireAuth(): Promise<SessionUser> {
    throw new Error('Authentication is disabled');
}

/**
 * No-op
 */
export async function setSession(user: SessionUser): Promise<void> {
    // No-op
}

/**
 * No-op
 */
export async function clearSession(): Promise<void> {
    // No-op
}
