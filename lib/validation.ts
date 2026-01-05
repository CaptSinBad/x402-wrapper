import { z } from 'zod';

/**
 * Input validation and sanitization
 * Protects against: SQL injection, XSS, invalid data
 */

// Common patterns
const emailSchema = z.string().email().max(255);
const urlSchema = z.string().url().max(2048);
const uuidSchema = z.string().uuid();
const slugSchema = z.string().min(1).max(100).regex(/^[a-z0-9-]+$/);

// Sanitize string input (prevent XSS)
export function sanitizeString(input: string): string {
    return input
        .trim()
        .replace(/[<>]/g, '') // Remove HTML tags
        .substring(0, 10000); // Max length
}

// Product validation
export const createProductSchema = z.object({
    name: z.string().min(1).max(255).transform(sanitizeString),
    description: z.string().max(5000).optional().transform(s => s ? sanitizeString(s) : undefined),
    price: z.number().positive().max(1000000),
    currency: z.enum(['USD', 'EUR', 'GBP']),
    stock_quantity: z.number().int().min(0).max(1000000).optional(),
    image_url: urlSchema.optional(),
    category_id: uuidSchema.optional(),
});

// Store validation
export const createStoreSchema = z.object({
    store_name: z.string().min(1).max(255).transform(sanitizeString),
    store_slug: slugSchema,
    description: z.string().max(1000).optional().transform(s => s ? sanitizeString(s) : undefined),
    logo_url: urlSchema.optional(),
    banner_url: urlSchema.optional(),
    theme_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

// Payment link validation
export const createPaymentLinkSchema = z.object({
    title: z.string().min(1).max(255).transform(sanitizeString),
    description: z.string().max(1000).optional().transform(s => s ? sanitizeString(s) : undefined),
    amount: z.number().positive().max(1000000),
    currency: z.enum(['USD', 'EUR', 'GBP']),
    expires_at: z.string().datetime().optional(),
});

// User registration validation
export const registerUserSchema = z.object({
    privyId: z.string().min(1),
    walletAddress: z.string().min(1).max(255).optional(),
    email: emailSchema.optional(),
    authMethod: z.enum(['wallet', 'email', 'social']),
});

/**
 * Validate and parse request body
 * Throws ZodError if validation fails
 */
export async function validateBody<T>(
    request: Request,
    schema: z.ZodSchema<T>
): Promise<T> {
    try {
        const body = await request.json();
        return schema.parse(body);
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error('[VALIDATION ERROR]', {
                errors: error.errors,
                timestamp: new Date().toISOString(),
            });
            throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`);
        }
        throw error;
    }
}
