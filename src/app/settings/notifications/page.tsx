'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import SendNotificationForm from '@/components/notifications/SendNotificationForm';
import { UserRole } from '@/types';

export default function SendNotificationPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!session?.user) {
    redirect('/auth/login');
  }

  // Only allow ADMIN, DIETITIAN, and HEALTH_COUNSELOR
  const allowedRoles = [UserRole.ADMIN, UserRole.DIETITIAN, UserRole.HEALTH_COUNSELOR];
  if (!allowedRoles.includes(session.user.role as UserRole)) {
    redirect('/dashboard');
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
