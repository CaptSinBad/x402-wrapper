import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware for subdomain routing (auth removed)
export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const hostname = request.headers.get('host') || '';

    // Handle subdomain routing for stores
    if (hostname.includes('.binahpay.shop') || hostname.includes('.localhost')) {
        const parts = hostname.split('.');
        const subdomain = parts[0];

        // Skip www, api, and localhost base domain
        const skipSubdomains = ['www', 'api', 'localhost'];
        const isBaseDomain = hostname === 'binahpay.shop' || hostname === 'localhost:3000' || hostname === 'localhost';

        if (!skipSubdomains.includes(subdomain) && !isBaseDomain && subdomain) {
            // Rewrite subdomain.binahpay.shop to /s/subdomain
            const url = request.nextUrl.clone();
            url.pathname = `/s/${subdomain}${pathname}`;
            return NextResponse.rewrite(url);
        }
    }

    // All routes are now public (auth removed)
    return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
    matcher: [
        // Match all routes for subdomain handling
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
