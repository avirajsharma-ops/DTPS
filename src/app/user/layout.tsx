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
  const fullUrl = headersList.get('x-url') || '';
  
  // Check if accessing password reset pages (these don't require auth)
  // Check pathname, referer, and full URL as fallbacks
  const isPasswordResetPage = 
    pathname.includes('/user/forget-password') || 
    pathname.includes('/user/reset-password') ||
    referer.includes('/user/forget-password') ||
    referer.includes('/user/reset-password') ||
    fullUrl.includes('/user/forget-password') ||
    fullUrl.includes('/user/reset-password');

  // For password reset pages, render without any auth check
  if (isPasswordResetPage) {
    return <>{children}</>;
  }

  const session = await getServerSession(authOptions);

  // Redirect to signin if no session
  if (!session) {
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
