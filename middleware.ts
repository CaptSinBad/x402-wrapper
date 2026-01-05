import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware to protect routes and handle subdomain routing
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

    // Protected routes that require authentication
    const protectedRoutes = ['/dashboard', '/onboarding'];

    // Check if current path is protected
    const isProtectedRoute = protectedRoutes.some(route =>
        pathname.startsWith(route)
    );

    if (isProtectedRoute) {
        // Check for Privy session cookie (any of these indicates auth)
        const hasPrivySession = request.cookies.get('privy-token') ||
            request.cookies.get('privy-id-token') ||
            request.cookies.get('privy-refresh-token');

        if (!hasPrivySession) {
            // Redirect to login if no Privy session
            const url = request.nextUrl.clone();
            url.pathname = '/login';
            url.searchParams.set('redirect', pathname);
            return NextResponse.redirect(url);
        }
    }

    return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
    matcher: [
        // Match all routes for subdomain handling
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
