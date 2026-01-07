'use client';

import { useEffect, useCallback, useRef } from 'react';
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
 * 1. Web push notifications (via Firebase Messaging) - ONLY for admin panel
 * 2. Native Android app FCM token registration (via WebView bridge) - for clients in native app
 * 
 * Note: 
 * - User/Client panel: No toast messages, only native app FCM registration
 * - Dietitian/Health Counselor panel: No web push notifications at all
 * - Admin panel: Full web push with toast notifications
 */
export function PushNotificationProvider({
    children,
    autoRegister = true,
    onNotification,
}: PushNotificationProviderProps) {
    const { data: session, status } = useSession();
    
    // Get user role
    const userRole = session?.user?.role?.toLowerCase() || '';
    const isClient = userRole === 'client';
    const isDietitianOrCounselor = userRole === 'dietitian' || userRole === 'health_counselor';
    const isAdmin = userRole.includes('admin');
    
    // Track last notification to prevent duplicates
    const lastNotificationRef = useRef<{ id: string; timestamp: number } | null>(null);
    
    // Helper to check if notification is duplicate
    const isDuplicateNotification = useCallback((title: string, body: string, data?: any): boolean => {
        const now = Date.now();
        const notificationId = `${title}-${body}-${JSON.stringify(data || {})}`;
        
        // Check if same notification was received within last 2 seconds
        if (lastNotificationRef.current) {
            const timeDiff = now - lastNotificationRef.current.timestamp;
            if (lastNotificationRef.current.id === notificationId && timeDiff < 2000) {
                console.log('[PushNotificationProvider] Duplicate notification detected, skipping');
                return true;
            }
        }
        
        // Update last notification
        lastNotificationRef.current = { id: notificationId, timestamp: now };
        return false;
    }, []);

    // Handle foreground notification display with toast - ONLY for admin
    const handleForegroundNotification = useCallback((payload: any) => {
        console.log('[PushNotificationProvider] Foreground notification received:', payload);
        
        // Skip toast for clients and dietitian/health counselor
        if (isClient || isDietitianOrCounselor) {
            console.log('[PushNotificationProvider] Skipping toast for non-admin user');
            // Still call custom handler if provided
            if (onNotification) {
                onNotification(payload);
            }
            return;
        }
        
        // Extract notification data
        const title = payload.notification?.title || payload.data?.title || 'New Notification';
        const body = payload.notification?.body || payload.data?.body || payload.data?.message || '';
        const type = payload.data?.type || 'general';
        
        // Check for duplicate notification
        if (isDuplicateNotification(title, body, payload.data)) {
            return;
        }
        
        // Determine the icon/emoji based on notification type
        const getIcon = (notificationType: string) => {
            switch (notificationType) {
                case 'new_message':
                case 'message':
                    return '💬';
                case 'appointment':
                case 'appointment_booked':
                case 'appointment_cancelled':
                    return '📅';
                case 'meal':
                case 'meal_plan_created':
                case 'meal_plan_updated':
                    return '🍽️';
                case 'payment':
                case 'payment_link_created':
                    return '💳';
                case 'task_assigned':
                    return '✅';
                case 'call':
                    return '📞';
                default:
                    return '🔔';
            }
        };

        const icon = getIcon(type);
        console.log('[PushNotificationProvider] Showing notification banner:', { title, body, type, icon });
        
        // Show toast notification with icon - ONLY for admin
        toast.success(`${icon} ${title}`, {
            description: body && body.length > 0 ? body : undefined,
            duration: 5000,
        });

        // Also call custom handler if provided
        if (onNotification) {
            onNotification(payload);
        }
    }, [onNotification, isDuplicateNotification, isClient, isDietitianOrCounselor]);

    // Only use web push notifications for admin (not for dietitian/health counselor)
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

    // Handle native app foreground notifications - NO toast for clients (user panel)
    const handleNativeForegroundNotification = useCallback((notification: ForegroundNotification) => {
        console.log('[PushNotificationProvider] Native foreground notification received:', JSON.stringify(notification));
        
        // Skip toast for clients - they use native app notifications directly
        // Only log and call custom handler
        if (isClient) {
            console.log('[PushNotificationProvider] Skipping toast for client in native app');
            if (onNotification) {
                onNotification({
                    notification: { title: notification.title, body: notification.body },
                    data: notification.data
                });
            }
            return;
        }
        
        const title = notification.title || 'New Notification';
        const body = notification.body || '';
        const type = notification.data?.type || 'general';
        
        // Check for duplicate notification (uses the same deduplication logic)
        if (isDuplicateNotification(title, body, notification.data)) {
            return;
        }
        
        // Determine the icon/emoji based on notification type
        const getNativeIcon = (notificationType: string) => {
            switch (notificationType) {
                case 'new_message':
                case 'message':
                    return '💬';
                case 'appointment':
                case 'appointment_booked':
                case 'appointment_cancelled':
                    return '📅';
                case 'meal':
                case 'meal_plan_created':
                case 'meal_plan_updated':
                    return '🍽️';
                case 'payment':
                case 'payment_link_created':
                    return '💳';
                case 'task_assigned':
                    return '✅';
                case 'call':
                    return '📞';
                default:
                    return '🔔';
            }
        };

        const icon = getNativeIcon(type);
        console.log('[PushNotificationProvider] Showing native notification banner:', { title, body, type, icon });
        
        // Show toast notification with icon - only for non-clients
        toast.success(`${icon} ${title}`, {
            description: body && body.length > 0 ? body : undefined,
            duration: 5000,
        });

        // Call user's custom handler if provided
        if (onNotification) {
            onNotification({
                notification: { title, body },
                data: notification.data
            });
        }
    }, [onNotification, isDuplicateNotification, isClient]);

    // Set up native foreground notification handler
    useEffect(() => {
        if (isNativeApp) {
            setNativeForegroundHandler(handleNativeForegroundNotification);
        }
    }, [isNativeApp, setNativeForegroundHandler, handleNativeForegroundNotification]);

    // Web push notification registration - ONLY for admin (not for dietitian/health counselor/client)
    useEffect(() => {
        // Only register for web if not in native app
        if (isNativeApp) {
            return;
        }
        
        // Skip web push for dietitian and health counselor
        if (isDietitianOrCounselor) {
            console.log('[PushNotificationProvider] Skipping web push for dietitian/health counselor');
            return;
        }
        
        // Only register if:
        // 1. Auto-register is enabled
        // 2. User is authenticated
        // 3. Notifications are supported
        // 4. Permission is already granted (don't prompt automatically)
        // 5. User is admin (not client or dietitian/health counselor)
        if (
            autoRegister &&
            status === 'authenticated' &&
            isSupported &&
            permission === 'granted' &&
            isAdmin
        ) {
            registerToken();
        }
    }, [autoRegister, status, isSupported, permission, registerToken, isNativeApp, isDietitianOrCounselor, isAdmin]);
    
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
