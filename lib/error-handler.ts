import crypto from 'crypto';

/**
 * Error codes with user-friendly messages
 */
export const ERROR_MESSAGES: Record<string, { message: string; retryable: boolean }> = {
    // Payment errors
    'payment_settlement_failed': {
        message: 'Payment processing failed. Please try again.',
        retryable: true
    },
    'invalid_signature': {
        message: 'Payment verification failed. Please contact support.',
        retryable: false
    },
    'link_expired': {
        message: 'This payment link has expired.',
        retryable: false
    },
    'link_not_found': {
        message: 'Payment link not found.',
        retryable: false
    },
    'wrong_network': {
        message: 'Please switch to the correct blockchain network.',
        retryable: true
    },
    'insufficient_funds': {
        message: 'Insufficient funds in your wallet.',
        retryable: false
    },

    // API errors
    'unauthorized': {
        message: 'Please log in to continue.',
        retryable: false
    },
    'network_error': {
        message: 'Network connection failed. Please check your internet.',
        retryable: true
    },
    'timeout': {
        message: 'Request timed out. Please try again.',
        retryable: true
    },

    // Generic fallback
    'internal_error': {
        message: 'Something went wrong. Please try again or contact support.',
        retryable: true
    }
};

/**
 * Format error for user display
 */
export function formatError(error: any): {
    code: string;
    message: string;
    retryable: boolean;
    details?: string;
} {
    // If error has our standard format
    if (error.error && ERROR_MESSAGES[error.error]) {
        const errorInfo = ERROR_MESSAGES[error.error];
        return {
            code: error.error,
            message: error.message || errorInfo.message,
            retryable: errorInfo.retryable,
            details: error.errorReason || error.details
        };
    }

    // Network errors
    if (error.message?.includes('fetch') || error.message?.includes('network')) {
        return {
            code: 'network_error',
            message: ERROR_MESSAGES.network_error.message,
            retryable: true
        };
    }

    // Timeout errors
    if (error.message?.includes('timeout')) {
        return {
            code: 'timeout',
            message: ERROR_MESSAGES.timeout.message,
            retryable: true
        };
    }

    // Fallback
    return {
        code: 'internal_error',
        message: ERROR_MESSAGES.internal_error.message,
        retryable: true,
        details: error.message
    };
}

/**
 * Log error with context
 */
export function logError(context: string, error: any, additionalInfo?: any) {
    console.error(`[${context}]`, {
        error: error.message || error,
        stack: error.stack,
        ...additionalInfo
    });
}

/**
 * Create standardized API error response
 */
export function createErrorResponse(
    errorCode: string,
    statusCode: number = 500,
    additionalData?: any
) {
    const errorInfo = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.internal_error;

    return {
        error: errorCode,
        message: errorInfo.message,
        retryable: errorInfo.retryable,
        ...additionalData
    };
}
