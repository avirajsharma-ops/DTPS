'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import BottomNavBar from '@/components/client/BottomNavBar';
import UserSidebar from '@/components/client/UserSidebar';
import SpoonGifLoader from '@/components/ui/SpoonGifLoader';
import { Menu } from 'lucide-react';

interface UserLayoutClientProps {
  children: ReactNode;
}

// Pages that should NOT show the navigation (like onboarding)
const PAGES_WITHOUT_NAV = ['/user/onboarding'];

/**
 * UserLayoutClient - Client-side layout wrapper for user pages
 * 
 * This component provides:
 * - Persistent navigation (doesn't reload on route change)
 * - Smooth page transition animations
 * - Only the center content reloads
 * - Sidebar for desktop/tablet
 * - Bottom navigation for mobile
 */
export default function UserLayoutClient({ children }: UserLayoutClientProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle route changes - show loader only after delay
  useEffect(() => {
    if (pathname !== prevPathname) {
      setPrevPathname(pathname);
      setIsNavigating(true);
      setSidebarOpen(false);
      setShowLoader(false);
      
      // Delay showing loader by 400ms - if page loads fast, no loader shown
      const loaderTimer = setTimeout(() => {
        if (isNavigating) {
          setShowLoader(true);
        }
      }, 400);
      
      // Content is ready after a short delay for smooth transition
      const contentTimer = setTimeout(() => {
        setIsNavigating(false);
        setShowLoader(false);
      }, 150);
      
      return () => {
        clearTimeout(loaderTimer);
        clearTimeout(contentTimer);
      };
    }
  }, [pathname]);

  // Check if current page should show navigation
  const showNavigation = !PAGES_WITHOUT_NAV.some(page => pathname.startsWith(page));

  // Show loading state only on initial mount, not on route changes
  if (!mounted || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#61a035]/10 to-[#3AB1A0]/10">
        <SpoonGifLoader size="lg" text="Loading..." />
      </div>
    );
  }

  // Redirect if not authenticated
  if (status === 'unauthenticated') {
    router.push('/client-auth/signin');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#61a035]/10 to-[#3AB1A0]/10">
        <SpoonGifLoader size="lg" text="Redirecting..." />
      </div>
    );
  }

  // If navigation should be hidden (e.g., onboarding), just render children
  if (!showNavigation) {
    return <>{children}</>;
  }

  return (
    <div className="relative flex flex-col min-h-screen bg-gray-50">
      {/* Sidebar overlay for mobile - slow fade */}
      <div 
        className={`fixed inset-0 bg-black z-40 lg:hidden transition-opacity duration-700 ease-out ${
          sidebarOpen ? 'opacity-50 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar for desktop - always mounted with slower animation */}
      <div className={`
        fixed inset-y-0 left-0 z-50 lg:z-30
        transform transition-transform duration-700 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <UserSidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />
      </div>

      {/* Main Content Area - this is what reloads on route change */}
      <main className="flex-1 pb-20 lg:pb-0 lg:ml-64">
        {/* Mobile Header */}
        <div className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shadow-sm lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 transition-all duration-150 rounded-lg hover:bg-gray-100 active:scale-95"
          >
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <Image
              src="/images/dtps-logo.png"
              alt="DTPS"
              width={28}
              height={28}
              className="object-contain"
            />
            <span className="text-lg font-bold text-[#E06A26]">DTPS</span>
          </div>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        {/* Page Content with delayed loader */}
        <div className="min-h-[calc(100vh-140px)] lg:min-h-[calc(100vh-20px)]">
          {showLoader && isNavigating ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm">
              <SpoonGifLoader size="lg" text="Loading..." />
            </div>
          ) : (
            <div className={`transition-opacity duration-300 ${isNavigating ? 'opacity-50' : 'opacity-100'}`}>
              {children}
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation - always visible on mobile, persists across route changes */}
      <div className="fixed bottom-0 left-0 right-0 z-30 lg:hidden">
        <BottomNavBar />
      </div>
    </div>
  );
}
