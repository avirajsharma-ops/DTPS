'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Target, Utensils, Plus, TrendingUp, User, Droplet, Scale, Calendar, Camera, Activity, Heart } from 'lucide-react';

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [showQuickActions, setShowQuickActions] = useState(false);

  const isActive = (path: string) => pathname === path;

  const quickActions = [
    {
      icon: Utensils,
      label: 'Log Food',
      gradient: 'from-orange-500 to-red-500',
      action: () => router.push('/food-log')
    },
    {
      icon: Droplet,
      label: 'Add Water',
      gradient: 'from-cyan-500 to-blue-500',
      action: () => {
        // Add water tracking functionality
        alert('Water tracking feature coming soon!');
      }
    },
    {
      icon: Scale,
      label: 'Log Weight',
      gradient: 'from-purple-500 to-pink-500',
      action: () => router.push('/progress')
    },
    {
      icon: Calendar,
      label: 'Book Appointment',
      gradient: 'from-emerald-500 to-teal-500',
      action: () => router.push('/appointments/book')
    },
    {
      icon: Camera,
      label: 'Progress Photo',
      gradient: 'from-indigo-500 to-purple-600',
      action: () => router.push('/progress?tab=photos')
    },
    {
      icon: Target,
      label: 'Set Goals',
      gradient: 'from-rose-500 to-pink-600',
      action: () => router.push('/goals')
    },
    {
      icon: Activity,
      label: 'Workout',
      gradient: 'from-green-500 to-emerald-600',
      action: () => router.push('/workouts')
    },
    {
      icon: Heart,
      label: 'Health Check',
      gradient: 'from-red-500 to-rose-600',
      action: () => router.push('/health')
    }
  ];

  const handleQuickActionClick = (action: () => void) => {
    setShowQuickActions(false);
    action();
  };

  return (
    <>
      {/* Quick Actions Overlay */}
      {showQuickActions && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-[8px] z-40"
          onClick={() => setShowQuickActions(false)}
        >
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-full max-w-sm px-4">
            {/* Quick Actions Grid */}
            <div className="bg-white rounded-3xl shadow-2xl p-6 max-h-[60vh] overflow-y-auto">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-1 bg-gray-300 rounded-full" />
              </div>

              <h3 className="text-lg font-bold text-gray-900 text-center mb-6">Quick Actions</h3>

              {/* Responsive Grid Layout */}
              <div className="quick-actions-grid grid grid-cols-2 gap-3 mb-4">
                {quickActions.map((action, index) => (
                  <button
                    key={action.label}
                    onClick={() => handleQuickActionClick(action.action)}
                    className={`quick-action-button p-3 sm:p-4 rounded-2xl bg-gradient-to-br ${action.gradient} text-white shadow-lg active:scale-95 transition-all animate-slide-up hover:shadow-xl`}
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <action.icon className="quick-action-icon h-6 w-6 sm:h-7 sm:w-7 mx-auto mb-2" />
                    <p className="quick-action-text text-xs font-semibold text-center leading-tight">{action.label}</p>
                  </button>
                ))}
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowQuickActions(false)}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-2xl font-semibold active:scale-98 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom z-50 md:hidden">
        <div className="grid grid-cols-5 h-16">
          <Link
            href="/client-dashboard"
            className={`flex flex-col items-center justify-center transition-colors ${
              isActive('/client-dashboard') ? 'text-purple-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Target className="h-6 w-6 mb-1" />
            <span className="text-xs font-medium">Home</span>
          </Link>

          <Link
            href="/food-log"
            className={`flex flex-col items-center justify-center transition-colors ${
              isActive('/food-log') ? 'text-purple-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Utensils className="h-6 w-6 mb-1" />
            <span className="text-xs font-medium">Food</span>
          </Link>

          <button
            onClick={() => setShowQuickActions(!showQuickActions)}
            className="flex flex-col items-center justify-center -mt-6"
          >
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg active:scale-95 transition-transform">
              <Plus
                className={`h-7 w-7 text-white transition-transform duration-300 ${
                  showQuickActions ? 'rotate-45' : 'rotate-0'
                }`}
              />
            </div>
          </button>

          <Link
            href="/progress"
            className={`flex flex-col items-center justify-center transition-colors ${
              isActive('/progress') ? 'text-purple-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <TrendingUp className="h-6 w-6 mb-1" />
            <span className="text-xs font-medium">Progress</span>
          </Link>

          <Link
            href="/profile"
            className={`flex flex-col items-center justify-center transition-colors ${
              isActive('/profile') ? 'text-purple-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <User className="h-6 w-6 mb-1" />
            <span className="text-xs font-medium">Profile</span>
          </Link>
        </div>
      </div>
    </>
  );
}

