'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Heart,
  BarChart3,
  Users,
  Calendar,
  MessageCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  User,
  FileText,
  TrendingUp,
  ChefHat,
  Clock,
  Utensils,
  CreditCard,
  DollarSign,
  Package,
  Wallet,
  AlertTriangle,
  Bell
} from 'lucide-react';
import { UserRole } from '@/types';

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className }: SidebarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const getNavigationItems = (role: UserRole) => {
    switch (role) {
      case UserRole.DIETITIAN:
        return [
          {
            href: '/dashboard/dietitian',
            label: 'Dashboard',
            icon: BarChart3,
            description: 'Overview and analytics'
          },
          {
            href: '/dietician/clients',
            label: 'My Clients',
            icon: Users,
            description: 'Manage your assigned clients'
          },
          {
            href: '/dietician/pending-plans',
            label: 'Pending Plans',
            icon: AlertTriangle,
            description: 'Clients needing meal plans'
          },
          {
            href: '/appointments',
            label: 'Appointments',
            icon: Calendar,
            description: 'Schedule and manage appointments'
          },
          {
            href: '/appointments/book-flexible',
            label: 'Flexible Booking',
            icon: Clock,
            description: 'Book at any time with any dietitian'
          },
          {
            href: '/meal-plan-templates',
            label: 'Diet Plan Templates',
            icon: FileText,
            description: 'Reusable Diet plan templates'
          },
          {
            href: '/recipes',
            label: 'Recipes',
            icon: ChefHat,
            description: 'Recipe database'
          },
          {
            href: '/messages',
            label: 'Messages',
            icon: MessageCircle,
            description: 'Client communications'
          },
          {
            href: '/settings/notifications',
            label: 'Send Notifications',
            icon: Bell,
            description: 'Send push notifications to clients'
          },
          {
            href: '/profile',
            label: 'Profile',
            icon: User,
            description: 'View your profile'
          },
          {
            href: '/settings',
            label: 'Settings',
            icon: Settings,
            description: 'Account settings'
          },
        ];
      case UserRole.HEALTH_COUNSELOR:
        // Health Counselors manage assigned clients only
        return [
          {
            href: '/health-counselor/clients',
            label: 'My Clients',
            icon: Users,
            description: 'Manage your assigned clients'
          },
          {
            href: '/health-counselor/recipes',
            label: 'Recipes',
            icon: ChefHat,
            description: 'View recipe database'
          },
          {
            href: '/health-counselor/appointments',
            label: 'Appointments',
            icon: Calendar,
            description: 'Schedule and manage appointments'
          },
          {
            href: '/health-counselor/messages',
            label: 'Messages',
            icon: MessageCircle,
            description: 'Client communications'
          },
          {
            href: '/settings/notifications',
            label: 'Send Notifications',
            icon: Bell,
            description: 'Send push notifications to clients'
          },
          {
            href: '/health-counselor/profile',
            label: 'Profile',
            icon: User,
            description: 'View your profile'
          },
          {
            href: '/settings',
            label: 'Settings',
            icon: Settings,
            description: 'Account settings'
          },
        ];
      case UserRole.CLIENT:
        return [
          {
            href: '/client-dashboard',
            label: 'Dashboard',
            icon: BarChart3,
            description: 'Your health overview'
          },
          { 
            href: '/my-plan', 
            label: 'My Plan', 
            icon: Heart,
            description: 'Current meal plan'
          },
          { 
            href: '/food-log', 
            label: 'Food Log', 
            icon: Utensils,
            description: 'Track your meals'
          },
          { 
            href: '/progress', 
            label: 'Progress', 
            icon: TrendingUp,
            description: 'Track your progress'
          },
          { 
            href: '/appointments', 
            label: 'Appointments', 
            icon: Calendar,
            description: 'Upcoming consultations'
          },
          {
            href: '/messages',
            label: 'Messages',
            icon: MessageCircle,
            description: 'Chat with your dietitian'
          },
          {
            href: '/billing',
            label: 'Billing',
            icon: CreditCard,
            description: 'Payments and billing'
          },
          {
            href: '/profile',
            label: 'Profile',
            icon: User,
            description: 'View your profile'
          },
          {
            href: '/settings',
            label: 'Settings',
            icon: Settings,
            description: 'Account settings'
          },
        ];
      case UserRole.ADMIN:
        return [
          {
            href: '/dashboard/admin',
            label: 'Dashboard',
            icon: BarChart3,
            description: 'System overview'
          },
          {
            href: '/users',
            label: 'Users',
            icon: Users,
            description: 'Manage all users'
          },
          {
            href: '/admin/allclients',
            label: 'All Clients',
            icon: Users,
            description: 'Assign dietitians to clients'
          },
          {
            href: '/admin/subscription-plans',
            label: 'Subscription Plans',
            icon: CreditCard,
            description: 'Manage subscription plans'
          },
          {
            href: '/admin/service-plans',
            label: 'Service Plans',
            icon: Package,
            description: 'Manage service plans with pricing'
          },
          {
            href: '/admin/appointments',
            label: 'All Appointments',
            icon: Calendar,
            description: 'View all booked meetings'
          },
          {
            href: '/appointments/book-flexible',
            label: 'Flexible Booking',
            icon: Clock,
            description: 'Book appointments for any user'
          },
          {
            href: '/admin/recipes',
            label: 'Recipes',
            icon: ChefHat,
            description: 'Manage recipe database'
          },
          {
            href: '/analytics',
            label: 'Analytics',
            icon: TrendingUp,
            description: 'Platform analytics'
          },
          {
            href: '/revenue-report',
            label: 'Revenue Report',
            icon: DollarSign,
            description: 'Detailed revenue analytics'
          },
          {
            href: '/admin/payments',
            label: 'User Payments',
            icon: CreditCard,
            description: 'View all user payments'
          },
          {
            href: '/admin/other-platform-payments',
            label: 'Other Payments',
            icon: Wallet,
            description: 'Review external payments'
          },
          {
            href: '/settings/notifications',
            label: 'Send Notifications',
            icon: Bell,
            description: 'Send push notifications to clients'
          },
          {
            href: '/profile',
            label: 'Profile',
            icon: User,
            description: 'View your profile'
          },
          {
            href: '/settings',
            label: 'Settings',
            icon: Settings,
            description: 'System settings'
          },
        ];
      default:
        return [];
    }
  };

  if (!session?.user) {
    return null;
  }

  const navigationItems = getNavigationItems(session.user.role);
  
  // Filter out Dashboard from sidebar nav items (it's shown in header)
  const filteredNavItems = navigationItems.filter(item => item.label !== 'Dashboard');

  const dashboardHref = session?.user?.role === UserRole.ADMIN 
    ? '/dashboard/admin' 
    : session?.user?.role === UserRole.CLIENT 
      ? '/client-dashboard' 
      : '/dashboard/dietitian';

  return (
    <div className={cn(
      "flex flex-col bg-white border-r border-gray-200 transition-all duration-300 h-screen",
      isCollapsed ? "w-[5.5rem]" : "w-[15.9rem]",
      className
    )}>
      {/* Header - Always shows Dashboard button */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!isCollapsed && (
          <Link
            href={dashboardHref}
            className="flex items-center space-x-2 px-3 py-1 rounded-lg bg-green-100 text-green-700 border border-green-200"
          >
            <BarChart3 className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium">Dashboard</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8 p-0"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2 flex flex-col gap-2">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-green-100 text-green-700 border border-green-200"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                isCollapsed && "justify-center"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className={cn("h-5 w-5", isActive && "text-green-600")} />
              {!isCollapsed && (
                <div className="flex flex-col">
                  <span>{item.label}</span>
                  <span className="text-xs text-gray-500">{item.description}</span>
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-gray-200">
        <div className={cn(
          "flex items-center space-x-3",
          isCollapsed && "justify-center"
        )}>
          <div className="shrink-0">
            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
              <User className="h-4 w-4 text-green-600" />
            </div>
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {session.user.name}
              </p>
              <p className="text-xs text-gray-500 truncate capitalize">
                {session.user.role}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
