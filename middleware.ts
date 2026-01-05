import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Protected routes that require authentication
const PROTECTED_ROUTES = [
    '/dashboard',
    '/onboarding',
];

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

    // Check if route is protected
    const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));

    if (isProtectedRoute) {
        // Check for Privy session cookie
        const privyToken = request.cookies.get('privy-token')?.value;

        // If no token, redirect to login
        if (!privyToken) {
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('redirect', pathname);
            return NextResponse.redirect(loginUrl);
        }
    }

    return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
    matcher: [
        // Match all routes for subdomain handling and auth
        '/((?!_next/static|_next/image|favicon.ico|api).*)',
    ],
};
