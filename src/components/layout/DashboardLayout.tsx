'use client';

import { ReactNode, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { cn } from '@/lib/utils';
import { NotificationPermissionBanner } from '@/components/notifications/NotificationPermissionBanner';
import { StaffUnreadCountProvider } from '@/contexts/StaffUnreadCountContext';

interface DashboardLayoutProps {
  children: ReactNode;
  className?: string;
  showSidebar?: boolean;
}

export default function DashboardLayout({ 
  children, 
  className,
  showSidebar = true 
}: DashboardLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 border-4 border-[#E06A26] border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 border-4 border-[#E06A26] border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <StaffUnreadCountProvider>
      <div className="h-screen bg-gray-50 flex overflow-hidden">
        {/* Sidebar - Full Height on Dashboard */}
        {showSidebar && (
          <div className="hidden lg:block h-screen shrink-0">
            <Sidebar />
          </div>
        )}
        
        {/* Main Content Area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <Navbar />
          {/* Notification Permission Banner for Staff */}
          <NotificationPermissionBanner 
            allowedRoles={['dietitian', 'health_counselor', 'admin']}
            className="mx-4 mt-2"
          />
          <main className={cn(
            "flex-1 overflow-y-auto",
            className
          )}>
            {children}
          </main>
        </div>
      </div>
    </StaffUnreadCountProvider>
  );
}
