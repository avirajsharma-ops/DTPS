import { withAuth } from 'next-auth/middleware';
import { NextResponse, NextRequest } from 'next/server';
import { UserRole } from '@/types';

// Public routes that should completely bypass middleware auth
const publicUserRoutes = [
  '/user/forget-password',
  '/user/reset-password',
];

// Check if the path is a public user route
function isPublicUserRoute(pathname: string): boolean {
  return publicUserRoutes.some(route => pathname.startsWith(route));
}

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;
    const fullUrl = req.nextUrl.href;

    // If it's a public user route, just pass through with pathname and URL headers
    if (isPublicUserRoute(pathname)) {
      const response = NextResponse.next();
      response.headers.set('x-pathname', pathname);
      response.headers.set('x-url', fullUrl);
      return response;
    }

    // If no token and not a public route, the authorized callback will handle redirect
    if (!token) {
      return NextResponse.next();
    }

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
    // Public user routes are already handled above, so we can safely check all /user routes here
    if (pathname.startsWith('/user') || pathname.startsWith('/dashboard/client') || pathname.startsWith('/client-dashboard')) {
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

        // Allow public read-only access to blogs endpoints (list + detail).
        // This prevents WebView cookie/session flakiness from hiding blogs UI.
        if (pathname.startsWith('/api/client/blogs')) {
          const method = req.method?.toUpperCase();
          if (method === 'GET' || method === 'HEAD') return true;
        }

        // CRITICAL: Check public user routes FIRST before anything else
        if (isPublicUserRoute(pathname)) {
          return true;
        }

        // Public routes that don't require authentication
        const publicRoutes = [
          '/auth/signin',
          '/auth/signup',
          '/auth/error',
          '/api/auth',
          '/api/user/forget-password',
          '/api/user/reset-password',
          '/client-login',
          '/client-auth/signin',
          '/client-auth/signup',
          '/client-auth/onboarding',
          '/client-auth/forget-password',
          '/client-auth/reset-password',
          '/client-auth/error',
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
     * - any file with an extension (static assets from /public like /icons/*.png)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|firebase-messaging-sw.js|.*\\..*).*)',
  ],
};
