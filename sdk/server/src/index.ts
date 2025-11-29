import * as crypto from 'crypto';

/**
 * BinahPay Server SDK
 * Official Node.js SDK for integrating BinahPay payments
 */

export interface LineItem {
    product_id: string;
    quantity: number;
}

export interface CheckoutSessionCreateParams {
    line_items: LineItem[];
    success_url?: string;
    cancel_url?: string;
    customer_email?: string;
    metadata?: Record<string, any>;
    mode?: 'payment';
}

export interface CheckoutSession {
    id: string;
    object: 'checkout.session';
    amount_total: number;
    currency: string;
    customer_email?: string;
    expires_at: string;
    metadata: Record<string, any>;
    mode: string;
    payment_status: 'unpaid' | 'paid';
    status: 'open' | 'complete' | 'expired';
    success_url?: string;
    cancel_url?: string;
    url: string;
    created: string;
}

export interface BinahPayConfig {
    apiKey: string;
    apiBase?: string;
}

export class BinahPay {
    private apiKey: string;
    private apiBase: string;

    constructor(apiKey: string, config?: { apiBase?: string }) {
        if (!apiKey) {
            throw new Error('BinahPay API key is required');
        }

        if (!apiKey.startsWith('pk_test_') && !apiKey.startsWith('pk_live_')) {
            throw new Error('Invalid API key format. Must start with pk_test_ or pk_live_');
        }

        this.apiKey = apiKey;
        this.apiBase = config?.apiBase || 'https://x402-wrapper-nld7.vercel.app';
    }

    /**
     * Checkout Sessions API
     */
    get checkout() {
        return {
            sessions: {
                /**
                 * Create a new checkout session
                 */
                create: async (params: CheckoutSessionCreateParams): Promise<CheckoutSession> => {
                    return this._request('POST', '/api/v1/checkout/sessions', params);
                },

                /**
                 * Retrieve a checkout session by ID
                 */
                retrieve: async (sessionId: string): Promise<CheckoutSession> => {
                    return this._request('GET', `/api/v1/checkout/sessions/${sessionId}`);
                },
            },
        };
    }

    /**
     * Webhooks utility
     */
    get webhooks() {
        return {
            /**
             * Verify webhook signature
             */
            constructEvent: (
                payload: string,
                signature: string,
                secret: string
            ): any => {
                return this._verifyWebhookSignature(payload, signature, secret);
            },
        };
    }

    /**
     * Make authenticated API request
     */
    private async _request(
        method: string,
        path: string,
        data?: any
    ): Promise<any> {
        const url = `${this.apiBase}${path}`;

        const headers: Record<string, string> = {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': 'BinahPay-Node/0.1.0',
        };

        const options: RequestInit = {
            method,
            headers,
        };

        if (data && (method === 'POST' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            const responseData = await response.json();

            if (!response.ok) {
                throw new BinahPayError(
                    responseData.error?.message || 'API request failed',
                    responseData.error?.code || 'api_error',
                    response.status,
                    responseData
                );
            }

            return responseData;
        } catch (error) {
            if (error instanceof BinahPayError) {
                throw error;
            }

            throw new BinahPayError(
                error instanceof Error ? error.message : 'Network error',
                'network_error',
                0,
                { originalError: error }
            );
        }
    }

    /**
     * Verify webhook signature
     */
    private _verifyWebhookSignature(
        payload: string,
        signature: string,
        secret: string
    ): any {
        // Parse signature header
        const [tPart, v1Part] = signature.split(',');

        if (!tPart || !v1Part) {
            throw new BinahPayError(
                'Invalid signature format',
                'invalid_signature',
                400,
                {}
            );
        }

        const timestamp = tPart.split('=')[1];
        const expectedSignature = v1Part.split('=')[1];

        // Check timestamp (prevent replay attacks - 5 minute tolerance)
        const timestampAge = Math.floor(Date.now() / 1000) - parseInt(timestamp);
        if (timestampAge > 300) {
            throw new BinahPayError(
                'Timestamp is too old',
                'timestamp_too_old',
                400,
                {}
            );
        }

        // Compute expected signature
        const signedPayload = `${timestamp}.${payload}`;
        const hmac = crypto.createHmac('sha256', secret);
        const computedSignature = hmac.update(signedPayload).digest('hex');

        // Compare signatures (constant time comparison)
        if (!crypto.timingSafeEqual(
            Buffer.from(computedSignature),
            Buffer.from(expectedSignature)
        )) {
            throw new BinahPayError(
                'Signature verification failed',
                'invalid_signature',
                400,
                {}
            );
        }

        // Parse and return event
        return JSON.parse(payload);
    }
}

/**
 * BinahPay Error class
 */
export class BinahPayError extends Error {
    code: string;
    statusCode: number;
    raw: any;

    constructor(message: string, code: string, statusCode: number, raw: any) {
        super(message);
        this.name = 'BinahPayError';
        this.code = code;
        this.statusCode = statusCode;
        this.raw = raw;

        // Maintains proper stack trace for where error was thrown
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, BinahPayError);
        }
    }
}

/**
 * Default export
 */
export default BinahPay;
