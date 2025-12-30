import { NextRequest, NextResponse } from 'next/server';
import { generateNonce } from '@/lib/auth/siwe';

// Store nonces temporarily (in production, use Redis or database)
const nonceStore = new Map<string, { nonce: string; createdAt: number }>();

// Clean up old nonces every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [address, data] of nonceStore.entries()) {
        if (now - data.createdAt > 10 * 60 * 1000) { // 10 minutes
            nonceStore.delete(address);
        }
    }
}, 5 * 60 * 1000);

/**
 * GET /api/auth/challenge
 * Generate a nonce for SIWE authentication
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get('address');

    if (!address) {
        return NextResponse.json(
            { error: 'address_required', message: 'Wallet address is required' },
            { status: 400 }
        );
    }

    const nonce = generateNonce();
    const normalizedAddress = address.toLowerCase();

    // Store nonce for this address
    nonceStore.set(normalizedAddress, {
        nonce,
        createdAt: Date.now(),
    });

    return NextResponse.json({ nonce });
}

/**
 * POST /api/auth/challenge/verify
 * Verify if a nonce exists for an address
 */
export async function POST(req: NextRequest) {
    const { address } = await req.json();

    if (!address) {
        return NextResponse.json(
            { error: 'address_required' },
            { status: 400 }
        );
    }

    const normalizedAddress = address.toLowerCase();
    const stored = nonceStore.get(normalizedAddress);

    if (!stored) {
        return NextResponse.json(
            { valid: false, message: 'No nonce found for this address' },
            { status: 404 }
        );
    }

    // Check if nonce is still valid (10 minutes)
    const age = Date.now() - stored.createdAt;
    if (age > 10 * 60 * 1000) {
        nonceStore.delete(normalizedAddress);
        return NextResponse.json(
            { valid: false, message: 'Nonce expired' },
            { status: 410 }
        );
    }

    return NextResponse.json({
        valid: true,
        nonce: stored.nonce,
    });
}

/**
 * Get and consume a nonce (removes it from store) - INTERNAL USE ONLY
 */
function consumeNonce(address: string): string | null {
    const normalizedAddress = address.toLowerCase();
    const stored = nonceStore.get(normalizedAddress);

    if (!stored) return null;

    // Check age
    const age = Date.now() - stored.createdAt;
    if (age > 10 * 60 * 1000) {
        nonceStore.delete(normalizedAddress);
        return null;
    }

    // Consume (delete) the nonce
    nonceStore.delete(normalizedAddress);
    return stored.nonce;
}
