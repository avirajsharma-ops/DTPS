'use client';

import { ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { cn } from '@/lib/utils';

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
    redirect('/auth/signin');
  }

  return (
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
        <main className={cn(
          "flex-1 overflow-y-auto",
          className
        )}>
          {children}
        </main>
      </div>
    </div>
  );
}
