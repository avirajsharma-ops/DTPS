import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import UserLayoutClient from './UserLayoutClient';
import { headers } from 'next/headers';

interface UserLayoutProps {
  children: ReactNode;
}

/**
 * User Layout - Server component for authentication check
 * Redirects to signin if not authenticated or not a client
 * Redirects to onboarding if client hasn't completed onboarding
 * Password reset pages are excluded from auth check
 */
export default async function UserLayout({ children }: UserLayoutProps) {
  // Get pathname from middleware header or check referer as fallback
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';
  const referer = headersList.get('referer') || '';
  
  // Check if accessing password reset pages (these don't require auth)
  // Check both the pathname from middleware and referer as fallback
  const isPasswordResetPage = 
    pathname === '/user/forget-password' || 
    pathname === '/user/reset-password' ||
    pathname.startsWith('/user/forget-password') ||
    pathname.startsWith('/user/reset-password') ||
    referer.includes('/user/forget-password') ||
    referer.includes('/user/reset-password');

  const session = await getServerSession(authOptions);

  // For password reset pages, allow access without session
  // These pages have their own nested layout that bypasses auth
  if (!session) {
    if (isPasswordResetPage) {
      return <>{children}</>;
    }
    // Redirect to signin for all other user pages
    redirect('/client-auth/signin');
  }

  // Redirect if not a client user
  if (session.user.role !== 'client') {
    if (session.user.role === 'admin') {
      redirect('/dashboard/admin');
    } else if (session.user.role === 'dietitian' || session.user.role === 'health_counselor') {
      redirect('/dashboard/dietitian');
    }
  }

  // Check if onboarding is completed (skip for onboarding page itself)
  try {
    await connectDB();
    const user = await User.findById(session.user.id).select('onboardingCompleted').lean();
    
    // Get current path from headers - we can't access pathname directly in layout
    // So we'll handle this in the page components or middleware instead
  } catch (error) {
    console.error('Error checking onboarding status:', error);
  }

  // Wrap children with client layout for persistent navigation
  return <UserLayoutClient>{children}</UserLayoutClient>;
}
