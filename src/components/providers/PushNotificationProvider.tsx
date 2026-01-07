'use client';

import { useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useNativeApp, ForegroundNotification } from '@/hooks/useNativeApp';
import { toast } from 'sonner';

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

    // Handle foreground notification display with toast
    const handleForegroundNotification = useCallback((payload: any) => {
        console.log('[PushNotificationProvider] Foreground notification received:', payload);
        
        // Extract notification data
        const title = payload.notification?.title || payload.data?.title || 'New Notification';
        const body = payload.notification?.body || payload.data?.body || payload.data?.message || '';
        const type = payload.data?.type || 'general';
        const clickAction = payload.data?.clickAction || payload.data?.url;
        
        // Show toast notification for foreground messages
        toast(title, {
            description: body,
            duration: 5000,
            action: clickAction ? {
                label: 'View',
                onClick: () => {
                    if (clickAction) {
                        window.location.href = clickAction;
                    }
                }
            } : undefined,
            icon: type === 'message' ? '💬' : 
                  type === 'appointment' || type === 'appointment_booked' ? '📅' :
                  type === 'meal' || type === 'meal_plan_created' ? '🍽️' :
                  type === 'payment' || type === 'payment_link_created' ? '💳' :
                  type === 'task_assigned' ? '✅' : '🔔',
        });

        // Call user's custom handler if provided
        if (onNotification) {
            onNotification(payload);
        }
    }, [onNotification]);

    const { isSupported, permission, registerToken } = usePushNotifications({
        autoRegister: false, // We'll handle it manually
        onNotification: handleForegroundNotification,
    });
    
    // Native app hook - handles FCM token registration for Android WebView
    const { 
        isNativeApp, 
        fcmToken, 
        tokenRegistered, 
        requestNotificationPermission: requestNativePermission,
        isLoading: nativeLoading,
        onForegroundNotification: setNativeForegroundHandler
    } = useNativeApp();

    // Handle native app foreground notifications with toast
    const handleNativeForegroundNotification = useCallback((notification: ForegroundNotification) => {
        console.log('[PushNotificationProvider] Native foreground notification:', notification);
        
        const title = notification.title || 'New Notification';
        const body = notification.body || '';
        const type = notification.data?.type || 'general';
        const clickAction = notification.data?.clickAction || notification.data?.url;
        
        // Show toast notification
        toast(title, {
            description: body,
            duration: 5000,
            action: clickAction ? {
                label: 'View',
                onClick: () => {
                    if (clickAction) {
                        window.location.href = clickAction;
                    }
                }
            } : undefined,
            icon: type === 'message' ? '💬' : 
                  type === 'appointment' || type === 'appointment_booked' ? '📅' :
                  type === 'meal' || type === 'meal_plan_created' ? '🍽️' :
                  type === 'payment' || type === 'payment_link_created' ? '💳' :
                  type === 'task_assigned' ? '✅' : '🔔',
        });

        // Call user's custom handler if provided
        if (onNotification) {
            onNotification({
                notification: { title, body },
                data: notification.data
            });
        }
    }, [onNotification]);

    // Set up native foreground notification handler
    useEffect(() => {
        if (isNativeApp) {
            setNativeForegroundHandler(handleNativeForegroundNotification);
        }
    }, [isNativeApp, setNativeForegroundHandler, handleNativeForegroundNotification]);

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
