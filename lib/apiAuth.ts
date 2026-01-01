/**
 * Stub API Auth module (auth removed)
 * All routes are now public
 */

import { NextRequest } from 'next/server';

export interface ApiAuthContext {
    project: {
        id: string;
        name: string;
        user_id: string;
        environment: 'test' | 'live';
        public_key: string;
        x402_tenant_id: string | null;
        x402_network: string;
    };
    user: {
        id: string;
        wallet_address?: string;
        email?: string;
    };
}

/**
 * Always throws (auth disabled)
 */
export async function requireApiAuth(req: NextRequest): Promise<ApiAuthContext> {
    throw new Error('API authentication is disabled');
}

/**
 * Always returns null (auth disabled)
 */
export async function optionalApiAuth(req: NextRequest): Promise<ApiAuthContext | null> {
    return null;
}

export class ApiAuthError extends Error {
    code: string;
    constructor(message: string, code: string) {
        super(message);
        this.name = 'ApiAuthError';
        this.code = code;
    }
}

export function formatApiError(error: any): { error: any; status: number } {
    return {
        error: {
            type: 'api_error',
            code: 'auth_disabled',
            message: 'Authentication is disabled',
        },
        status: 401,
    };
}
