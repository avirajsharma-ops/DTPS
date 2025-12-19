'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, UtensilsCrossed, ListTodo, BarChart3, User } from 'lucide-react';

export default function BottomNavBar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/user') {
      return pathname === '/user';
    }
    return pathname.startsWith(href);
  };

  const navItems = [
    { href: '/user', icon: Home, label: 'Home' },
    { href: '/user/plan', icon: UtensilsCrossed, label: 'Meal' },
    { href: '/user/tasks', icon: ListTodo, label: 'Tasks' },
    { href: '/user/progress', icon: BarChart3, label: 'Progress' },
    { href: '/user/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 z-50">
      <div className="pb-safe max-w-md mx-auto">
        <div className="flex items-center justify-between gap-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-center"
            >
              <item.icon
                className={`h-6 w-6 ${isActive(item.href) ? 'text-green-600' : 'text-gray-400'
                  }`}
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
