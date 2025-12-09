import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { UserRole } from '@/types';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Normalize role to lowercase for comparison
    const userRole = token?.role?.toLowerCase();

    // Check if user is trying to access a role-specific route
    // Admin routes - allow anyone with admin in their role
    if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard/admin')) {
      if (!userRole || !userRole.includes('admin')) {
        console.log('Admin access denied. Role:', token?.role);
        // Redirect non-admins to their appropriate dashboard
        const redirectPath = userRole === 'dietitian' || userRole === 'health_counselor'
          ? '/dashboard/dietitian'
          : userRole === 'client'
          ? '/dashboard/client'
          : '/auth/signin';
        return NextResponse.redirect(new URL(redirectPath, req.url));
      }
    }
    
    // Dietitian/Health Counselor routes
    if (pathname.startsWith('/dietician') || pathname.startsWith('/dashboard/dietitian')) {
      if (userRole !== 'dietitian' && 
          userRole !== 'health_counselor' && 
          !userRole?.includes('admin')) {
        // Redirect to appropriate dashboard
        const redirectPath = userRole === 'client'
          ? '/dashboard/client'
          : '/dashboard/admin';
        return NextResponse.redirect(new URL(redirectPath, req.url));
      }
    }
    
    // Client routes
    if (pathname.startsWith('/dashboard/client') || pathname.startsWith('/client-dashboard')) {
      if (userRole !== 'client' && !userRole?.includes('admin')) {
        // Redirect to appropriate dashboard
        const redirectPath = userRole === 'dietitian' || userRole === 'health_counselor'
          ? '/dashboard/dietitian'
          : '/dashboard/admin';
        return NextResponse.redirect(new URL(redirectPath, req.url));
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
