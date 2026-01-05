'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useCallback } from 'react';

/**
 * Hook to get Privy auth token for API calls
 * Use this in all client components that make authenticated API requests
 */
export function useAuthToken() {
    const { getAccessToken } = usePrivy();

    /**
     * Get current access token
     * Returns null if not authenticated
     */
    const getToken = useCallback(async (): Promise<string | null> => {
        try {
            const token = await getAccessToken();
            return token;
        } catch (error) {
            console.error('[useAuthToken] Failed to get token:', error);
            return null;
        }
    }, [getAccessToken]);

    /**
     * Make authenticated API call
     * Automatically adds Authorization header
     */
    const authFetch = useCallback(async (
        url: string,
        options: RequestInit = {}
    ): Promise<Response> => {
        const token = await getToken();

        if (!token) {
            throw new Error('Not authenticated');
        }

        return fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
    }, [getToken]);

    return { getToken, authFetch };
}
