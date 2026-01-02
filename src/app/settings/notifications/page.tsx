'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import SendNotificationForm from '@/components/notifications/SendNotificationForm';
import { UserRole } from '@/types';

// Define allowed roles outside component to prevent recreation
const ALLOWED_ROLES = [UserRole.ADMIN, UserRole.DIETITIAN, UserRole.HEALTH_COUNSELOR];

export default function SendNotificationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated' && session?.user && !ALLOWED_ROLES.includes(session.user.role as UserRole)) {
      router.push('/dashboard');
    }
  }, [status, session?.user?.role, router]);

  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!session?.user || !ALLOWED_ROLES.includes(session.user.role as UserRole)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Send Notifications</h1>
          <p className="text-muted-foreground">
            Send custom push notifications to your clients
          </p>
        </div>
        
        <SendNotificationForm />
      </div>
    </DashboardLayout>
  );
}
