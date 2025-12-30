import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'development-secret-change-in-production'
);

const JWT_ISSUER = 'binahpay';
const JWT_AUDIENCE = 'binahpay-users';

export interface JWTPayload {
    userId: string;
    walletAddress: string;
    authMethod: 'wallet' | 'email';
    role?: string;
}

/**
 * Create a JWT token for a user session
 * 
 * @param payload User data to encode in the token
 * @param expiresIn Token expiration (default: 7 days)
 * @returns Signed JWT token
 */
export async function createToken(
    payload: JWTPayload,
    expiresIn: string = '7d'
): Promise<string> {
    const token = await new SignJWT({ ...payload })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setIssuer(JWT_ISSUER)
        .setAudience(JWT_AUDIENCE)
        .setExpirationTime(expiresIn)
        .sign(JWT_SECRET);

    return token;
}

/**
 * Verify and decode a JWT token
 * 
 * @param token JWT token string
 * @returns Decoded payload or null if invalid/expired
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET, {
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE,
        });

        // Extract our custom fields from the verified payload
        if (!payload.userId || !payload.walletAddress || !payload.authMethod) {
            return null;
        }

        return {
            userId: payload.userId as string,
            walletAddress: payload.walletAddress as string,
            authMethod: payload.authMethod as 'wallet' | 'email',
            role: payload.role as string | undefined,
        };
    } catch (error) {
        console.error('[JWT] Token verification failed:', error);
        return null;
    }
}

/**
 * Decode a token without verifying (for debugging)
 * WARNING: Do not use for authentication
 */
export function decodeToken(token: string): any {
    try {
        const [, payloadBase64] = token.split('.');
        const payload = JSON.parse(
            Buffer.from(payloadBase64, 'base64url').toString()
        );
        return payload;
    } catch {
        return null;
    }
}
