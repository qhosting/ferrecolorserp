
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    const isAuthPage = req.nextUrl.pathname.startsWith('/auth') || 
                      req.nextUrl.pathname.startsWith('/api/auth');
    const isTestPage = req.nextUrl.pathname.startsWith('/test-');
    
    // If not authenticated and trying to access protected route (but allow test pages)
    if (!token && !isAuthPage && !isTestPage && req.nextUrl.pathname !== '/') {
      return NextResponse.redirect(new URL('/auth/signin', req.url));
    }
    
    // If authenticated and trying to access auth pages (except API routes)
    if (token && isAuthPage && !req.nextUrl.pathname.startsWith('/api/auth')) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // If not authenticated and accessing root, redirect to signin
    if (!token && req.nextUrl.pathname === '/') {
      return NextResponse.redirect(new URL('/auth/signin', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to auth pages and test pages
        if (req.nextUrl.pathname.startsWith('/auth') || 
            req.nextUrl.pathname.startsWith('/api/auth') ||
            req.nextUrl.pathname.startsWith('/test-')) {
          return true;
        }
        // Require token for all other pages
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
