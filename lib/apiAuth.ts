// API Key Authentication for Merchant APIs
// Validates Bearer token from Authorization header and returns project context

import { NextRequest } from 'next/server';
import { NextRequest } from 'next/server';
import { query } from './db';
import crypto from 'crypto';

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
 * Extract and validate API key from Authorization header
 */
function extractApiKey(req: NextRequest): string | null {
    const authHeader = req.headers.get('authorization');

    if (!authHeader) {
        return null;
    }

    // Check for Bearer token format
    const match = authHeader.match(/^Bearer (.+)$/i);
    if (!match) {
        return null;
    }

    return match[1];
}

/**
 * Validate API key format
 * Valid formats: pk_test_xxx or pk_live_xxx
 */
function validateKeyFormat(key: string): { valid: boolean; environment?: 'test' | 'live' } {
    // Public key format: pk_{env}_{random}
    const testKeyMatch = key.match(/^pk_test_[a-zA-Z0-9_-]+$/);
    const liveKeyMatch = key.match(/^pk_live_[a-zA-Z0-9_-]+$/);

    if (testKeyMatch) {
        return { valid: true, environment: 'test' };
    }

    if (liveKeyMatch) {
        return { valid: true, environment: 'live' };
    }

    return { valid: false };
}

/**
 * Require API key authentication
 * Throws error if authentication fails
 */
export async function requireApiAuth(req: NextRequest): Promise<ApiAuthContext> {
    // Extract API key
    const apiKey = extractApiKey(req);

    if (!apiKey) {
        throw new ApiAuthError('Missing API key. Include Authorization: Bearer pk_xxx header', 'missing_api_key');
    }

    // Validate format
    const formatCheck = validateKeyFormat(apiKey);
    if (!formatCheck.valid) {
        throw new ApiAuthError('Invalid API key format', 'invalid_api_key');
    }

    // Look up project by public key
    try {
        // Look up project by public key
        try {
            const result = await query(
                `SELECT 
                p.id, 
                p.name, 
                p.user_id, 
                p.environment, 
                p.public_key,
                p.x402_tenant_id,
                p.x402_network,
                u.id as user_id,
                u.wallet_address,
                u.email
             FROM projects p
             JOIN users u ON u.id = p.user_id
             WHERE p.public_key = $1`,
                [apiKey]
            );

            if (result.rows.length === 0) {
                throw new ApiAuthError('Invalid API key', 'invalid_api_key');
            }

            const row = result.rows[0];

            // Verify environment matches key prefix
            if (row.environment !== formatCheck.environment) {
                throw new ApiAuthError(
                    `API key environment mismatch. Use ${row.environment} key for this project`,
                    'api_key_mismatch'
                );
            }

            return {
                project: {
                    id: row.id,
                    name: row.name,
                    user_id: row.user_id,
                    environment: row.environment,
                    public_key: row.public_key,
                    x402_tenant_id: row.x402_tenant_id,
                    x402_network: row.x402_network || 'base-sepolia',
                },
                user: {
                    id: row.user_id,
                    wallet_address: row.wallet_address,
                    email: row.email,
                },
            };
        } catch (error) {
            if (error instanceof ApiAuthError) {
                throw error;
            }

            console.error('[apiAuth] Database error:', error);
            throw new ApiAuthError('Authentication failed', 'auth_error');
        }
    }

/**
 * Optional API auth - returns null if no key provided
 * Useful for endpoints that support both authenticated and unauthenticated access
 */
export async function optionalApiAuth(req: NextRequest): Promise<ApiAuthContext | null> {
        try {
            return await requireApiAuth(req);
        } catch (error) {
            if (error instanceof ApiAuthError && error.code === 'missing_api_key') {
                return null;
            }
            throw error;
        }
    }

    /**
     * Custom error class for API authentication errors
     */
    export class ApiAuthError extends Error {
        code: string;

        constructor(message: string, code: string) {
            super(message);
            this.name = 'ApiAuthError';
            this.code = code;
        }
    }

    /**
     * Format error response for API authentication failures
     */
    export function formatApiError(error: any): { error: any; status: number } {
        if (error instanceof ApiAuthError) {
            return {
                error: {
                    type: 'authentication_error',
                    code: error.code,
                    message: error.message,
                },
                status: 401,
            };
        }

        return {
            error: {
                type: 'api_error',
                code: 'internal_error',
                message: 'An internal error occurred',
            },
            status: 500,
        };
    }
