'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardList, BarChart3, User, Plus } from 'lucide-react';

interface BottomNavBarProps {
  onAddClick?: () => void;
}

export default function BottomNavBar({ onAddClick }: BottomNavBarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/user') {
      return pathname === '/user';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 z-50">
      {/* Safe area for iOS devices */}
      <div className="pb-safe">
        <div className="flex items-center justify-between max-w-md mx-auto relative">
          {/* Home */}
          <Link 
            href="/user" 
            className="flex flex-col items-center gap-1 min-w-[48px]"
          >
            <Home className={`h-6 w-6 ${isActive('/user') ? 'text-green-600' : 'text-gray-400'}`} />
            {isActive('/user') && (
              <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
            )}
          </Link>

          {/* Plan */}
          <Link 
            href="/user/plan" 
            className="flex flex-col items-center gap-1 min-w-[48px]"
          >
            <ClipboardList className={`h-6 w-6 ${isActive('/user/plan') ? 'text-green-600' : 'text-gray-400'}`} />
            {isActive('/user/plan') && (
              <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
            )}
          </Link>

          {/* Center Add Button */}
          <button 
            onClick={onAddClick}
            className="h-14 w-14 rounded-full bg-gray-900 flex items-center justify-center -mt-8 shadow-lg hover:bg-gray-800 active:scale-95 transition-all"
          >
            <Plus className="h-7 w-7 text-white" />
          </button>

          {/* Progress */}
          <Link 
            href="/user/progress" 
            className="flex flex-col items-center gap-1 min-w-[48px]"
          >
            <BarChart3 className={`h-6 w-6 ${isActive('/user/progress') ? 'text-green-600' : 'text-gray-400'}`} />
            {isActive('/user/progress') && (
              <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
            )}
          </Link>

          {/* Profile */}
          <Link 
            href="/user/profile" 
            className="flex flex-col items-center gap-1 min-w-[48px]"
          >
            <User className={`h-6 w-6 ${isActive('/user/profile') ? 'text-green-600' : 'text-gray-400'}`} />
            {isActive('/user/profile') && (
              <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
            )}
          </Link>
        </div>
      </div>
    </div>
  );
}
