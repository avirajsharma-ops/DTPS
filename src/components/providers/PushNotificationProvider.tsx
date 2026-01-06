'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useNativeApp } from '@/hooks/useNativeApp';

interface PushNotificationProviderProps {
    children: React.ReactNode;
    autoRegister?: boolean;
    onNotification?: (payload: any) => void;
}

/**
 * Provider component that handles push notification registration
 * Add this to your layout or a high-level component
 * 
 * Handles both:
 * 1. Web push notifications (via Firebase Messaging)
 * 2. Native Android app FCM token registration (via WebView bridge)
 */
export function PushNotificationProvider({
    children,
    autoRegister = true,
    onNotification,
}: PushNotificationProviderProps) {
    const { status } = useSession();
    const { isSupported, permission, registerToken } = usePushNotifications({
        autoRegister: false, // We'll handle it manually
        onNotification,
    });
    
    // Native app hook - handles FCM token registration for Android WebView
    const { 
        isNativeApp, 
        fcmToken, 
        tokenRegistered, 
        requestNotificationPermission: requestNativePermission,
        isLoading: nativeLoading 
    } = useNativeApp();

    // Web push notification registration
    useEffect(() => {
        // Only register for web if not in native app
        if (isNativeApp) {
            return;
        }
        
        // Only register if:
        // 1. Auto-register is enabled
        // 2. User is authenticated
        // 3. Notifications are supported
        // 4. Permission is already granted (don't prompt automatically)
        if (
            autoRegister &&
            status === 'authenticated' &&
            isSupported &&
            permission === 'granted'
        ) {
            registerToken();
        }
    }, [autoRegister, status, isSupported, permission, registerToken, isNativeApp]);
    
    // Native app - log token registration status
    useEffect(() => {
        if (isNativeApp && !nativeLoading) {
            if (tokenRegistered) {
                console.log('[PushNotificationProvider] Native FCM token registered successfully');
            } else if (fcmToken) {
                console.log('[PushNotificationProvider] Native FCM token available, waiting for registration...');
            } else {
                console.log('[PushNotificationProvider] Native app detected, waiting for FCM token...');
            }
        }
    }, [isNativeApp, nativeLoading, tokenRegistered, fcmToken]);

    return <>{children}</>;
}

export default PushNotificationProvider;
