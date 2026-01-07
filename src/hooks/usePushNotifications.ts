'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
    registerFCMTokenWithBackend,
    unregisterFCMToken,
    onForegroundMessage,
    isPushNotificationSupported,
    getNotificationPermission,
    requestNotificationPermission,
    showNotification,
} from '@/lib/firebase/fcmHelper';

interface UsePushNotificationsOptions {
    autoRegister?: boolean;
    onNotification?: (payload: any) => void;
}

interface UsePushNotificationsReturn {
    isSupported: boolean;
    permission: NotificationPermission | 'unsupported';
    isRegistered: boolean;
    isLoading: boolean;
    error: string | null;
    requestPermission: () => Promise<boolean>;
    registerToken: () => Promise<boolean>;
    unregisterToken: () => Promise<boolean>;
}

export function usePushNotifications(
    options: UsePushNotificationsOptions = {}
): UsePushNotificationsReturn {
    const { autoRegister = true, onNotification } = options;
    const { data: session, status } = useSession();

    const [isSupported, setIsSupported] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
    const [isRegistered, setIsRegistered] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const unsubscribeRef = useRef<(() => void) | null>(null);
    const hasRegisteredRef = useRef(false);

    // Check support on mount
    useEffect(() => {
        const supported = isPushNotificationSupported();
        setIsSupported(supported);

        if (supported) {
            setPermission(getNotificationPermission());
        } else {
            setPermission('unsupported');
        }
    }, []);

    // Set up foreground message listener
    useEffect(() => {
        if (!isSupported || !isRegistered) {
            return;
        }

        console.log('[usePushNotifications] Setting up foreground message listener...');

        unsubscribeRef.current = onForegroundMessage((payload) => {
            console.log('[usePushNotifications] Foreground message received:', payload);

            // Call custom handler first (which will show toast in PushNotificationProvider)
            if (onNotification) {
                console.log('[usePushNotifications] Calling custom notification handler');
                onNotification(payload);
            }

            // Also show browser notification as fallback
            if (payload.notification) {
                console.log('[usePushNotifications] Showing browser notification:', payload.notification.title);
                showNotification(payload.notification.title || 'Notification', {
                    body: payload.notification.body,
                    icon: payload.notification.icon || '/icons/icon-192x192.png',
                    data: payload.data,
                });
            }
        });

        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }
        };
    }, [isSupported, isRegistered, onNotification]);

    // Request permission
    const requestPermission = useCallback(async (): Promise<boolean> => {
        if (!isSupported) {
            setError('Push notifications are not supported in this browser');
            return false;
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await requestNotificationPermission();
            setPermission(result);
            return result === 'granted';
        } catch (err: any) {
            setError(err.message || 'Failed to request permission');
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [isSupported]);

    // Register token with backend
    const registerToken = useCallback(async (): Promise<boolean> => {
        if (!isSupported) {
            setError('Push notifications are not supported');
            return false;
        }

        if (permission !== 'granted') {
            const granted = await requestPermission();
            if (!granted) {
                return false;
            }
        }

        setIsLoading(true);
        setError(null);

        try {
            const success = await registerFCMTokenWithBackend();
            setIsRegistered(success);
            hasRegisteredRef.current = success;
            return success;
        } catch (err: any) {
            setError(err.message || 'Failed to register for push notifications');
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [isSupported, permission, requestPermission]);

    // Unregister token
    const unregisterToken = useCallback(async (): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        try {
            const success = await unregisterFCMToken();
            if (success) {
                setIsRegistered(false);
                hasRegisteredRef.current = false;
            }
            return success;
        } catch (err: any) {
            setError(err.message || 'Failed to unregister');
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Auto-register when user is authenticated
    useEffect(() => {
        if (
            autoRegister &&
            status === 'authenticated' &&
            session?.user?.id &&
            isSupported &&
            permission === 'granted' &&
            !hasRegisteredRef.current
        ) {
            registerToken();
        }
    }, [autoRegister, status, session, isSupported, permission, registerToken]);

    return {
        isSupported,
        permission,
        isRegistered,
        isLoading,
        error,
        requestPermission,
        registerToken,
        unregisterToken,
    };
}

export default usePushNotifications;
