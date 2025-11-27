import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware to protect routes
export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Protected routes that require authentication
    const protectedRoutes = ['/dashboard', '/onboarding'];

    // Check if current path is protected
    const isProtectedRoute = protectedRoutes.some(route =>
        pathname.startsWith(route)
    );

    if (isProtectedRoute) {
        // Check for session token cookie
        const sessionToken = request.cookies.get('session_token');

        if (!sessionToken) {
            // Redirect to login if no session
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
        '/dashboard/:path*',
        '/onboarding/:path*',
    ],
};
