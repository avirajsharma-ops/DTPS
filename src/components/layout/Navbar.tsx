'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import previewImage from "@/app/public/icons/app-icon-original.png"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  User,
  Settings,
  LogOut,
  Menu,
  X,
  Heart,
  Calendar,
  MessageCircle,
  BarChart3,
  Users
} from 'lucide-react';
import { UserRole } from '@/types';
import Image from 'next/image';

export default function Navbar() {
  const pathname = usePathname();
  const isDashboard = pathname?.includes('/dashboard');
  const { data: session, status } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const getDashboardLink = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return '/dashboard/admin';
      case UserRole.DIETITIAN:
      case UserRole.HEALTH_COUNSELOR:
        return '/dashboard/dietitian';
      case UserRole.CLIENT:
        return '/client-dashboard';
      default:
        return '/dashboard';
    }
  };

  type NavigationItem = {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  };

  const getNavigationItems = (role: UserRole): NavigationItem[] => {
    const baseItems: NavigationItem[] = [
      { href: getDashboardLink(role), label: 'Dashboard', icon: BarChart3 },
    ];

    switch (role) {
     
      case UserRole.CLIENT:
        return [
          ...baseItems,
          { href: '/my-plan', label: 'My Plan', icon: Heart },
          { href: '/appointments', label: 'Appointments', icon: Calendar },
          { href: '/progress', label: 'Progress', icon: BarChart3 },
          { href: '/messages', label: 'Messages', icon: MessageCircle },
        ];
      case UserRole.ADMIN:
        return [
          ...baseItems,
          { href: '/users', label: 'Users', icon: Users },
          { href: '/analytics', label: 'Analytics', icon: BarChart3 },
        ];
      default:
        return baseItems;
    }
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  if (status === 'loading') {
    return (
      <nav className="border-b bg-white safe-area-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <Heart className="h-6 w-6 text-green-600" />
                <span className="text-lg font-semibold text-gray-900">DTPS</span>
              </div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="border-b bg-white sticky top-0 z-50 safe-area-top">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex items-center space-x-2">
              <Heart className="h-6 w-6 text-green-600" />
              <span className="text-lg font-semibold text-gray-900">DTPS</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          {session?.user && (
            <div className="hidden md:flex items-center space-x-4">
              {getNavigationItems(session.user.role).map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {session?.user ? (
              <>
                {/* Mobile menu button */}
                <div className="md:hidden">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  >
                    {isMobileMenuOpen ? (
                      <X className="h-5 w-5" />
                    ) : (
                      <Menu className="h-5 w-5" />
                    )}
                  </Button>
                </div>

                {/* User dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage 
                          src={session.user.avatar} 
                          alt={session.user.name} 
                        />
                        <AvatarFallback>
                          {getInitials(session.user.firstName, session.user.lastName)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {session.user.name}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {session.user.email}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground capitalize">
                          {session.user.role}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="ghost" asChild>
                  <Link href="/auth/signin">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link href="/auth/signup">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {session?.user && isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t">
              {getNavigationItems(session.user.role).map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
