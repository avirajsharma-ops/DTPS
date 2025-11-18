'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserRole } from '@/types';

export default function RevenueReportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/auth/signin');
      return;
    }

    // Only allow admin and health counselor access
    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.HEALTH_COUNSELOR) {
      router.push('/dashboard');
      return;
    }

    setLoading(false);
  }, [session, status, router]);

  const handleIframeLoad = () => {
    setLoading(false);
    setIframeError(false);
  };

  const handleIframeError = () => {
    setLoading(false);
    setIframeError(true);
  };

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <LoadingSpinner size="lg" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Loading Revenue Report</h3>
              <p className="text-gray-600">Please wait while we load the analytics dashboard...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!session || (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.HEALTH_COUNSELOR)) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        

        {/* Content */}
        <div className="flex-1 relative">
          {iframeError ? (
            <div className="p-6">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Unable to load the revenue report. Please check your internet connection or try opening the report in a new tab.
                </AlertDescription>
              </Alert>
              <div className="mt-4 space-x-2">
                <Button
                  onClick={() => {
                    setIframeError(false);
                    setLoading(true);
                  }}
                >
                  Retry
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open('https://dtps.app/', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
              </div>
            </div>
          ) : (
            <>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                  <div className="text-center space-y-4">
                    <LoadingSpinner size="lg" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Loading Analytics Dashboard</h3>
                      <p className="text-gray-600">Connecting to DTPS analytics platform...</p>
                    </div>
                  </div>
                </div>
              )}
              <iframe
                src="https://dtps.app/"
                className="w-full h-full border-0"
                title="Revenue Report - DTPS Analytics"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
