'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Signal, SignalLow, SignalMedium, SignalHigh } from 'lucide-react';
import { isNative, getNetworkStatus, onNetworkChange } from '@/lib/native/capacitor-bridge';

interface NetworkStatusIndicatorProps {
    showAlways?: boolean;
    className?: string;
}

export function NetworkStatusIndicator({
    showAlways = false,
    className = '',
}: NetworkStatusIndicatorProps) {
    const [isOnline, setIsOnline] = useState(true);
    const [connectionType, setConnectionType] = useState('unknown');
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
        const checkNetwork = async () => {
            if (isNative) {
                const status = await getNetworkStatus();
                setIsOnline(status.connected);
                setConnectionType(status.connectionType);
            } else {
                setIsOnline(navigator.onLine);
                setConnectionType(navigator.onLine ? 'wifi' : 'none');
            }
        };

        checkNetwork();

        // Setup listeners
        if (isNative) {
            const unsubscribe = onNetworkChange((connected, type) => {
                setIsOnline(connected);
                setConnectionType(type);

                // Show banner briefly when status changes
                if (!connected) {
                    setShowBanner(true);
                } else {
                    setShowBanner(true);
                    setTimeout(() => setShowBanner(false), 3000);
                }
            });
            return unsubscribe;
        } else {
            const handleOnline = () => {
                setIsOnline(true);
                setConnectionType('wifi');
                setShowBanner(true);
                setTimeout(() => setShowBanner(false), 3000);
            };

            const handleOffline = () => {
                setIsOnline(false);
                setConnectionType('none');
                setShowBanner(true);
            };

            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);

            return () => {
                window.removeEventListener('online', handleOnline);
                window.removeEventListener('offline', handleOffline);
            };
        }
    }, []);

    // Get icon based on connection type
    const getConnectionIcon = () => {
        if (!isOnline) {
            return <WifiOff className="w-4 h-4" />;
        }

        switch (connectionType) {
            case 'wifi':
                return <Wifi className="w-4 h-4" />;
            case '4g':
            case 'lte':
                return <SignalHigh className="w-4 h-4" />;
            case '3g':
                return <SignalMedium className="w-4 h-4" />;
            case '2g':
                return <SignalLow className="w-4 h-4" />;
            default:
                return <Signal className="w-4 h-4" />;
        }
    };

    // Don't show if online and showAlways is false
    if (isOnline && !showAlways && !showBanner) {
        return null;
    }

    return (
        <div
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${showBanner || !isOnline ? 'translate-y-0' : '-translate-y-full'
                } ${className}`}
        >
            <div
                className={`flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium ${isOnline
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                    }`}
            >
                {getConnectionIcon()}
                <span>
                    {isOnline
                        ? 'Back online'
                        : 'No internet connection'}
                </span>
            </div>
        </div>
    );
}

export default NetworkStatusIndicator;
