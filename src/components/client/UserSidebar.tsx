'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { X, LayoutDashboard, Heart, Utensils, TrendingUp, Calendar, MessageCircle, CreditCard, User, Settings, HelpCircle, LogOut } from 'lucide-react';

interface UserSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserSidebar({ isOpen, onClose }: UserSidebarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();

  // Close sidebar when clicking outside or pressing escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const menuItems = [
    { href: '/user', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/user/plan', label: 'My Meal Plan', icon: Heart },
    { href: '/user/food-log', label: 'Food Log', icon: Utensils },
    { href: '/user/progress', label: 'Progress', icon: TrendingUp },
    { href: '/user/appointments', label: 'Appointments', icon: Calendar },
    { href: '/user/messages', label: 'Messages', icon: MessageCircle, badge: 2 },
    { href: '/user/billing', label: 'Billing', icon: CreditCard },
    { href: '/user/profile', label: 'Profile', icon: User },
    { href: '/user/settings', label: 'Settings', icon: Settings },
    { href: '/user/help', label: 'Help & Support', icon: HelpCircle },
  ];

  const userName = session?.user?.firstName && session?.user?.lastName 
    ? `${session.user.firstName} ${session.user.lastName}` 
    : session?.user?.name || 'User';
  const userEmail = session?.user?.email || '';
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/client-auth/signin' });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div 
        className={`fixed top-0 left-0 h-full w-72 bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">DTPS</h2>
          <button 
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
          <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
            {session?.user?.avatar ? (
              <img 
                src={session.user.avatar} 
                alt="Profile" 
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-emerald-600 font-semibold">{userInitials}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
            <p className="text-xs text-gray-500 truncate">{userEmail}</p>
          </div>
        
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto py-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-emerald-50 text-emerald-600' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} />
                <span className={`flex-1 text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {item.label}
                </span>
                {item.badge && (
                  <span className="h-5 min-w-5 px-1.5 rounded-full bg-emerald-500 text-white text-xs font-medium flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
                {isActive && (
                  <span className="text-xs text-emerald-500 font-medium">✓ Done</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sign Out */}
        <div className="border-t border-gray-100 p-4">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
}
