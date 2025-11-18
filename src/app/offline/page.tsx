'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WifiOff, RefreshCw, Home, Calendar, User } from 'lucide-react';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-redirect when back online
      setTimeout(() => {
        router.push('/client-dashboard');
      }, 1000);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [router]);

  const handleRetry = () => {
    if (navigator.onLine) {
      router.push('/client-dashboard');
    } else {
      // Force a network check
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center">
              <WifiOff className="h-8 w-8 text-gray-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              You're Offline
            </CardTitle>
            <CardDescription>
              {isOnline 
                ? "Connection restored! Redirecting..." 
                : "Check your internet connection and try again"
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {isOnline ? (
              <Alert className="border-green-200 bg-green-50">
                <RefreshCw className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Connection restored! Taking you back to your dashboard...
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-orange-200 bg-orange-50">
                <WifiOff className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  Some features may not be available while offline. Your data will sync when you're back online.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <Button 
                onClick={handleRetry} 
                className="w-full"
                disabled={isOnline}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isOnline ? 'animate-spin' : ''}`} />
                {isOnline ? 'Connecting...' : 'Try Again'}
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/')}
                  className="flex flex-col items-center py-6 h-auto"
                >
                  <Home className="h-5 w-5 mb-1" />
                  <span className="text-xs">Home</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/client-dashboard')}
                  className="flex flex-col items-center py-6 h-auto"
                >
                  <User className="h-5 w-5 mb-1" />
                  <span className="text-xs">Dashboard</span>
                </Button>
              </div>
            </div>

            <div className="text-center">
              <h3 className="font-semibold text-gray-900 mb-2">Available Offline:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• View cached meal plans</li>
                <li>• Review previous appointments</li>
                <li>• Access saved progress data</li>
                <li>• Browse nutrition tips</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-1">Tip</h4>
              <p className="text-sm text-blue-800">
                Install this app on your device for a better offline experience. 
                Look for the "Add to Home Screen" option in your browser menu.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
