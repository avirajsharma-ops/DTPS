'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { WebLayout } from './web/WebLayout';
import { MobileLayout } from './mobile/MobileLayout';

interface ResponsiveLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  showSearch?: boolean;
  showBottomNav?: boolean;
  headerAction?: ReactNode;
  className?: string;
}

/**
 * ResponsiveLayout - Automatically switches between Web and Mobile layouts
 * 
 * Breakpoints:
 * - Mobile: < 768px (uses MobileLayout)
 * - Tablet/Desktop: >= 768px (uses WebLayout)
 * 
 * Features:
 * - SSR safe with hydration handling
 * - Automatic layout switching based on screen size
 * - Consistent props API for both layouts
 */
export function ResponsiveLayout({
  children,
  title,
  subtitle,
  showBack = false,
  onBack,
  showSearch = true,
  showBottomNav = true,
  headerAction,
  className,
}: ResponsiveLayoutProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    checkMobile();

    // Listen for resize
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <MobileLayout
        title={title}
        subtitle={subtitle}
        showBack={showBack}
        onBack={onBack}
        showBottomNav={showBottomNav}
        headerAction={headerAction}
        className={className}
      >
        {children}
      </MobileLayout>
    );
  }

  // Web/Desktop Layout
  return (
    <WebLayout
      title={title}
      subtitle={subtitle}
      showSearch={showSearch}
      headerAction={headerAction}
      className={className}
    >
      {children}
    </WebLayout>
  );
}

export default ResponsiveLayout;
