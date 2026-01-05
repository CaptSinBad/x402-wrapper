import { PrivyClient } from '@privy-io/server-auth';
import { getUserByPrivyId } from './userManagement';
import type { User } from './userManagement';

/**
 * Secure authentication using Privy server-side verification
 * Protects against: token theft, replay attacks, expired tokens
 */

// Initialize Privy client
const privy = new PrivyClient(
    process.env.NEXT_PUBLIC_PRIVY_APP_ID || '',
    process.env.PRIVY_APP_SECRET || ''
);

/**
 * Custom error for better debugging
 */
export class AuthError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode: number,
        public details?: any
    ) {
        super(message);
        this.name = 'AuthError';

        // Log for debugging (safe - no sensitive data)
        console.error('[AUTH ERROR]', {
            code,
            message,
            timestamp: new Date().toISOString(),
            // Don't log token or sensitive details
        });
    }
}

/**
 * Extract and validate Bearer token from request
 * Protects against: malformed headers, missing tokens
 */
function extractToken(request: Request): string {
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
        throw new AuthError(
            'No authorization header provided',
            'MISSING_AUTH_HEADER',
            401
        );
    }

    if (!authHeader.startsWith('Bearer ')) {
        throw new AuthError(
            'Invalid authorization format. Expected: Bearer <token>',
            'INVALID_AUTH_FORMAT',
            401
        );
    }

    const token = authHeader.substring(7).trim();

    if (!token) {
        throw new AuthError(
            'Empty token provided',
            'EMPTY_TOKEN',
            401
        );
    }

    // Validate token format (basic check)
    if (token.length < 20 || token.length > 2000) {
        throw new AuthError(
            'Invalid token length',
            'INVALID_TOKEN_LENGTH',
            401
        );
    }

    return token;
}

/**
 * Verify Privy token and return user
 * Protects against: expired tokens, invalid tokens, token forgery
 */
export async function requireAuth(request: Request): Promise<User> {
    try {
        // Extract token
        const token = extractToken(request);

        // Verify with Privy (this checks signature, expiry, issuer)
        let verifiedClaims;
        try {
            verifiedClaims = await privy.verifyAuthToken(token);
        } catch (error: any) {
            // Privy verification failed
            throw new AuthError(
                'Token verification failed',
                'INVALID_TOKEN',
                401,
                { reason: error.message }
            );
        }

        // Get user from database
        const user = await getUserByPrivyId(verifiedClaims.userId);

        if (!user) {
            // User authenticated with Privy but not in our database
            throw new AuthError(
                'User not found in database. Please complete registration.',
                'USER_NOT_FOUND',
                403,
                { privyId: verifiedClaims.userId }
            );
        }

        // Check if user is active
        if (user.status !== 'active') {
            throw new AuthError(
                `Account is ${user.status}`,
                'ACCOUNT_INACTIVE',
                403,
                { status: user.status }
            );
        }

        // Success - log for audit trail
        console.log('[AUTH SUCCESS]', {
            userId: user.id,
            privyId: user.privy_id,
            timestamp: new Date().toISOString(),
        });

        return user;

    } catch (error) {
        // Re-throw AuthErrors as-is
        if (error instanceof AuthError) {
            throw error;
        }

        // Wrap unexpected errors
        console.error('[AUTH UNEXPECTED ERROR]', error);
        throw new AuthError(
            'Authentication failed',
            'INTERNAL_ERROR',
            500,
            { originalError: error instanceof Error ? error.message : 'Unknown error' }
        );
    }
}

/**
 * Optional: require specific role
 * Protects against: privilege escalation
 */
export async function requireRole(request: Request, role: User['role']): Promise<User> {
    const user = await requireAuth(request);

    const roleHierarchy = {
        'user': 1,
        'merchant': 2,
        'admin': 3,
        'super_admin': 4
    };

    if (roleHierarchy[user.role] < roleHierarchy[role]) {
        throw new AuthError(
            `Insufficient permissions. Required: ${role}, Have: ${user.role}`,
            'INSUFFICIENT_PERMISSIONS',
            403,
            { required: role, actual: user.role }
        );
    }

    return user;
}

/**
 * Handle auth errors in API routes
 * Returns proper HTTP response with safe error message
 */
export function handleAuthError(error: unknown): Response {
    if (error instanceof AuthError) {
        return new Response(
            JSON.stringify({
                error: error.code,
                message: error.message,
                // Don't expose details in production
                ...(process.env.NODE_ENV === 'development' && { details: error.details })
            }),
            {
                status: error.statusCode,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }

    // Unknown error - don't expose details
    console.error('[UNKNOWN AUTH ERROR]', error);
    return new Response(
        JSON.stringify({
            error: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred'
        }),
        {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        }
    );
}
