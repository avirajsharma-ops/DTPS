'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
    isNative,
    isAndroid,
    isIOS,
    isWeb,
    getPlatformInfo,
    initializeApp,
    setupBackButtonHandler,
    getNetworkStatus,
    onNetworkChange,
    registerPushNotifications,
    onPushNotificationReceived,
    openExternalUrl,
    exitApp,
} from '@/lib/native/capacitor-bridge';

interface UseNativeAppOptions {
    onBackButton?: () => boolean;
    onNetworkChange?: (connected: boolean, type: string) => void;
    onPushNotification?: (notification: any) => void;
    onAppStateChange?: (isActive: boolean) => void;
}

interface UseNativeAppReturn {
    isNative: boolean;
    isAndroid: boolean;
    isIOS: boolean;
    isWeb: boolean;
    isOnline: boolean;
    connectionType: string;
    isInitialized: boolean;
    pushToken: string | null;
    openExternalLink: (url: string) => Promise<void>;
    exit: () => Promise<void>;
    registerForPush: () => Promise<string | null>;
}

export function useNativeApp(
    options: UseNativeAppOptions = {}
): UseNativeAppReturn {
    const { onBackButton, onNetworkChange: onNetworkChangeCallback, onPushNotification, onAppStateChange } =
        options;

    const [isInitialized, setIsInitialized] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const [connectionType, setConnectionType] = useState('unknown');
    const [pushToken, setPushToken] = useState<string | null>(null);

    const onBackButtonRef = useRef(onBackButton);
    onBackButtonRef.current = onBackButton;

    // Initialize native app
    useEffect(() => {
        const init = async () => {
            if (isNative) {
                await initializeApp();

                // Get initial network status
                const status = await getNetworkStatus();
                setIsOnline(status.connected);
                setConnectionType(status.connectionType);
            }

            setIsInitialized(true);
        };

        init();
    }, []);

    // Setup back button handler
    useEffect(() => {
        if (isAndroid) {
            setupBackButtonHandler(() => {
                if (onBackButtonRef.current) {
                    return onBackButtonRef.current();
                }
                return false;
            });
        }
    }, []);

    // Network change listener
    useEffect(() => {
        const unsubscribe = onNetworkChange((connected, type) => {
            setIsOnline(connected);
            setConnectionType(type);
            onNetworkChangeCallback?.(connected, type);
        });

        return unsubscribe;
    }, [onNetworkChangeCallback]);

    // Push notification listener
    useEffect(() => {
        if (!isNative || !onPushNotification) return;

        const unsubscribe = onPushNotificationReceived(onPushNotification);
        return unsubscribe;
    }, [onPushNotification]);

    // App state change listener
    useEffect(() => {
        if (!onAppStateChange) return;

        const handler = (e: CustomEvent) => {
            onAppStateChange(e.detail.isActive);
        };

        window.addEventListener('appStateChange', handler as EventListener);

        return () => {
            window.removeEventListener('appStateChange', handler as EventListener);
        };
    }, [onAppStateChange]);

    // Register for push notifications
    const registerForPush = useCallback(async () => {
        const token = await registerPushNotifications();
        if (token) {
            setPushToken(token);
        }
        return token;
    }, []);

    // Open external link
    const openExternalLink = useCallback(async (url: string) => {
        await openExternalUrl(url);
    }, []);

    // Exit app
    const exit = useCallback(async () => {
        await exitApp();
    }, []);

    return {
        isNative,
        isAndroid,
        isIOS,
        isWeb,
        isOnline,
        connectionType,
        isInitialized,
        pushToken,
        openExternalLink,
        exit,
        registerForPush,
    };
}

export default useNativeApp;
