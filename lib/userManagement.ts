import { query } from './db';

export type Role = 'user' | 'merchant' | 'admin' | 'super_admin';
export type AuthMethod = 'wallet' | 'email' | 'social';
export type UserStatus = 'active' | 'suspended' | 'deleted';

export interface User {
    id: string;
    privy_id: string;
    wallet_address?: string;
    email?: string;
    email_verified: boolean;
    auth_method: AuthMethod;
    role: Role;
    status: UserStatus;
    daily_withdrawal_limit: number;
    withdrawn_today: number;
    last_withdrawal_reset: Date;
    last_login_at?: Date;
    created_at: Date;
    updated_at: Date;
}

/**
 * Get user from database by Privy ID
 */
export async function getUserByPrivyId(privyId: string): Promise<User | null> {
    const result = await query<User>(
        `SELECT * FROM users WHERE privy_id = $1`,
        [privyId]
    );
    return result.rows[0] || null;
}

/**
 * Create user on first login from Privy data
 */
export async function createUserFromPrivy(params: {
    privyId: string;
    walletAddress?: string;
    email?: string;
    authMethod: AuthMethod;
}): Promise<User> {
    const { privyId, walletAddress, email, authMethod } = params;

    const result = await query<User>(
        `INSERT INTO users (privy_id, wallet_address, email, auth_method, role, status, email_verified)
     VALUES ($1, $2, $3, $4, 'user', 'active', $5)
     RETURNING *`,
        [privyId, walletAddress, email, authMethod, !!email]
    );

    return result.rows[0];
}

/**
 * Update user's last login timestamp
 */
export async function updateLastLogin(userId: string): Promise<void> {
    await query(
        `UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [userId]
    );
}

/**
 * Check if user has required role (role hierarchy)
 */
export async function hasRole(userId: string, requiredRole: Role): Promise<boolean> {
    const result = await query<{ role: Role }>(
        `SELECT role FROM users WHERE id = $1 AND status = 'active'`,
        [userId]
    );

    if (!result.rows[0]) return false;

    const userRole = result.rows[0].role;

    // Role hierarchy: super_admin > admin > merchant > user
    const roleHierarchy: Record<Role, number> = {
        'user': 1,
        'merchant': 2,
        'admin': 3,
        'super_admin': 4
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Get or create user from Privy session
 * This is called after successful Privy authentication
 */
export async function getOrCreateUser(privyUser: {
    id: string;
    wallet?: { address: string };
    email?: { address: string };
    linkedAccounts: Array<{ type: string }>;
}): Promise<User> {
    // Try to find existing user
    let user = await getUserByPrivyId(privyUser.id);

    if (user) {
        // Update last login
        await updateLastLogin(user.id);
        return user;
    }

    // Create new user
    const authMethod: AuthMethod = privyUser.wallet ? 'wallet' :
        privyUser.email ? 'email' : 'social';

    user = await createUserFromPrivy({
        privyId: privyUser.id,
        walletAddress: privyUser.wallet?.address,
        email: privyUser.email?.address,
        authMethod,
    });

    return user;
}
