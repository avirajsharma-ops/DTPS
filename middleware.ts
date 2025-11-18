import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { UserRole } from '@/types';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Define role-based route access
    const roleRoutes = {
      [UserRole.ADMIN]: ['/dashboard/admin'],
      [UserRole.DIETITIAN]: ['/dashboard/dietitian'],
      [UserRole.HEALTH_COUNSELOR]: ['/dashboard/dietitian'], // Health counselors use same dashboard as dietitians
      [UserRole.CLIENT]: ['/dashboard/client'],
    };

    // Check if user is trying to access a role-specific route
    for (const [role, routes] of Object.entries(roleRoutes)) {
      for (const route of routes) {
        if (pathname.startsWith(route)) {
          // Special handling for dietitian dashboard - allow both dietitians and health counselors
          if (route === '/dashboard/dietitian') {
            if (token?.role !== UserRole.DIETITIAN &&
                token?.role !== UserRole.HEALTH_COUNSELOR &&
                token?.role !== UserRole.ADMIN) {
              // Redirect to appropriate dashboard based on user role
              const redirectPath = token?.role === UserRole.CLIENT
                ? '/dashboard/client'
                : '/dashboard/admin';

              return NextResponse.redirect(new URL(redirectPath, req.url));
            }
          } else {
            // For other routes, check exact role match
            if (token?.role !== role && token?.role !== UserRole.ADMIN) {
              // Redirect to appropriate dashboard based on user role
              const redirectPath = token?.role === UserRole.DIETITIAN || token?.role === UserRole.HEALTH_COUNSELOR
                ? '/dashboard/dietitian'
                : token?.role === UserRole.CLIENT
                ? '/dashboard/client'
                : '/dashboard/admin';

              return NextResponse.redirect(new URL(redirectPath, req.url));
            }
          }
        }
      }
    }

    // Allow access to the route
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;

        // Public routes that don't require authentication
        const publicRoutes = [
          '/',
          '/auth/signin',
          '/auth/signup',
          '/auth/error',
          '/api/auth',
          '/client-login',
        ];

        // Check if the route is public
        const isPublicRoute = publicRoutes.some(route => 
          pathname.startsWith(route)
        );

        if (isPublicRoute) {
          return true;
        }

        // All other routes require authentication
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
