'use client';

import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isNative, getNetworkStatus, onNetworkChange } from '@/lib/native/capacitor-bridge';

interface OfflineFallbackProps {
    children: React.ReactNode;
    fallbackMessage?: string;
}

export function OfflineFallback({
    children,
    fallbackMessage = 'You are currently offline. Please check your internet connection.',
}: OfflineFallbackProps) {
    const [isOnline, setIsOnline] = useState(true);
    const [isRetrying, setIsRetrying] = useState(false);
    const [hasChecked, setHasChecked] = useState(false);

    useEffect(() => {
        const checkNetwork = async () => {
            if (isNative) {
                const status = await getNetworkStatus();
                setIsOnline(status.connected);
            } else {
                setIsOnline(navigator.onLine);
            }
            setHasChecked(true);
        };

        checkNetwork();

        // Setup listeners
        if (isNative) {
            const unsubscribe = onNetworkChange((connected) => {
                setIsOnline(connected);
            });
            return unsubscribe;
        } else {
            const handleOnline = () => setIsOnline(true);
            const handleOffline = () => setIsOnline(false);

            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);

            return () => {
                window.removeEventListener('online', handleOnline);
                window.removeEventListener('offline', handleOffline);
            };
        }
    }, []);

    const handleRetry = async () => {
        setIsRetrying(true);

        // Re-check network status
        if (isNative) {
            const status = await getNetworkStatus();
            setIsOnline(status.connected);
        } else {
            setIsOnline(navigator.onLine);
        }

        // If online, reload the page
        if (navigator.onLine) {
            window.location.reload();
        }

        setTimeout(() => {
            setIsRetrying(false);
        }, 1000);
    };

    // Don't show anything until we've checked
    if (!hasChecked) {
        return <>{children}</>;
    }

    if (!isOnline) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="max-w-md w-full text-center space-y-6">
                    <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                        <WifiOff className="w-10 h-10 text-gray-400" />
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-2xl font-semibold text-gray-900">No Internet Connection</h2>
                        <p className="text-gray-500">{fallbackMessage}</p>
                    </div>

                    <Button
                        onClick={handleRetry}
                        disabled={isRetrying}
                        className="w-full max-w-xs"
                    >
                        {isRetrying ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Checking...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Try Again
                            </>
                        )}
                    </Button>

                    <p className="text-sm text-gray-400">
                        Make sure you are connected to Wi-Fi or mobile data
                    </p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

export default OfflineFallback;
