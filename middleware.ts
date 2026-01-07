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
        
        const redirectPath = userRole === 'dietitian' 
          ? '/dashboard/dietitian'
          : userRole === 'health_counselor'
          ? '/health-counselor/clients'
          : userRole === 'client'
          ? '/user'
          : '/client-auth/signin';
        return NextResponse.redirect(new URL(redirectPath, req.url));
      }
    }
    
    // Health Counselor specific routes
    if (pathname.startsWith('/health-counselor')) {
      if (userRole !== 'health_counselor' && !userRole?.includes('admin')) {
        console.log('Health Counselor access denied. Role:', token?.role);
        const redirectPath = userRole === 'dietitian'
          ? '/dashboard/dietitian'
          : userRole === 'client'
          ? '/user'
          : '/client-auth/signin';
        return NextResponse.redirect(new URL(redirectPath, req.url));
      }
    }
    
    // Dietitian/Health Counselor routes
    if (pathname.startsWith('/dietician') || pathname.startsWith('/dashboard/dietitian')) {
      if (userRole !== 'dietitian' && 
          userRole !== 'health_counselor' && 
          !userRole?.includes('admin')) {
        console.log('Dietitian access denied. Role:', token?.role);
        // Redirect to appropriate dashboard
        const redirectPath = userRole === 'client'
          ? '/user'
          : '/client-auth/signin';
        return NextResponse.redirect(new URL(redirectPath, req.url));
      }
    }
    
    // Client/User routes - only for clients (NOT for admin or dietitian)
    // Skip auth routes that are under /user but should be publicly accessible
    const isUserPublicRoute = pathname === '/user/forget-password' || pathname === '/user/reset-password';
    if (!isUserPublicRoute && (pathname.startsWith('/user') || pathname.startsWith('/dashboard/client') || pathname.startsWith('/client-dashboard'))) {
      if (userRole !== 'client') {
        console.log('Client access denied. Role:', token?.role);
        // Redirect to appropriate dashboard
        const redirectPath = userRole === 'dietitian' 
          ? '/dashboard/dietitian'
          : userRole === 'health_counselor'
          ? '/health-counselor/clients'
          : userRole === 'admin'
          ? '/admin'
          : '/client-auth/signin';
        return NextResponse.redirect(new URL(redirectPath, req.url));
      }
    }

    // Allow access to the route - add pathname header for layout detection
    const response = NextResponse.next();
    response.headers.set('x-pathname', pathname);
    return response;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;

        // Public routes that don't require authentication
        const publicRoutes = [
          '/auth/signin',
          '/auth/signup',
          '/auth/error',
          '/api/auth',
          '/api/user/forget-password',
          '/api/user/reset-password',
          '/client-login',
          '/user/forget-password',
          '/user/reset-password',
          '/client-auth/signin',
          '/client-auth/signup',
          '/client-auth/onboarding',
          '/client-auth/forget-password',
          '/client-auth/reset-password',
        ];
        
        // Exact match for home page
        if (pathname === '/') {
          return true;
        }

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
