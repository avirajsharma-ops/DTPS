'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import {
    isNative,
    isAndroid,
    isIOS,
    isWeb,
    initializeApp,
    registerPushNotifications,
    onPushNotificationReceived,
    onPushNotificationActionPerformed,
    getNetworkStatus,
    onNetworkChange,
    persistSession,
    clearSession,
    sendToNative,
    openExternalUrl,
} from '@/lib/native/capacitor-bridge';

interface NativeAppContextValue {
    isNative: boolean;
    isAndroid: boolean;
    isIOS: boolean;
    isWeb: boolean;
    isOnline: boolean;
    isInitialized: boolean;
    pushToken: string | null;
    registerForPush: () => Promise<void>;
    openExternalLink: (url: string) => Promise<void>;
}

const NativeAppContext = createContext<NativeAppContextValue | undefined>(undefined);

interface NativeAppProviderProps {
    children: ReactNode;
}

export function NativeAppProvider({ children }: NativeAppProviderProps) {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const router = useRouter();

    const [isInitialized, setIsInitialized] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const [pushToken, setPushToken] = useState<string | null>(null);

    // Initialize native app on mount
    useEffect(() => {
        const init = async () => {
            if (isNative) {
                await initializeApp();

                // Get initial network status
                const status = await getNetworkStatus();
                setIsOnline(status.connected);

                // Setup network listener
                onNetworkChange((connected) => {
                    setIsOnline(connected);
                });

                // Setup push notification listeners
                onPushNotificationReceived((notification) => {
                    console.log('Push notification received:', notification);
                    // You can show a toast or in-app notification here
                });

                onPushNotificationActionPerformed((action) => {
                    console.log('Push notification action:', action);
                    // Handle notification tap - navigate to relevant screen
                    const data = action.notification.data;
                    if (data?.url) {
                        router.push(data.url);
                    }
                });
            }

            setIsInitialized(true);
        };

        init();
    }, [router]);

    // Persist session when it changes
    useEffect(() => {
        if (isNative && status === 'authenticated' && session) {
            persistSession(session);
            sendToNative('login_success', { userId: session.user?.id });
        } else if (isNative && status === 'unauthenticated') {
            clearSession();
            sendToNative('logout');
        }
    }, [session, status]);

    // Track route changes
    useEffect(() => {
        if (isNative && pathname) {
            sendToNative('route_change', { path: pathname });
        }
    }, [pathname]);

    // Register for push notifications
    const registerForPush = async () => {
        if (!isNative) {
            console.log('Push notifications only available on native platforms');
            return;
        }

        const token = await registerPushNotifications();
        if (token) {
            setPushToken(token);

            // Send token to your backend
            if (session?.user?.id) {
                try {
                    await fetch('/api/fcm/token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            token,
                            deviceType: isAndroid ? 'android' : 'ios',
                            deviceInfo: navigator.userAgent,
                        }),
                    });
                } catch (error) {
                    console.error('Error registering push token with backend:', error);
                }
            }
        }
    };

    // Open external link
    const openExternalLink = async (url: string) => {
        await openExternalUrl(url);
    };

    const value: NativeAppContextValue = {
        isNative,
        isAndroid,
        isIOS,
        isWeb,
        isOnline,
        isInitialized,
        pushToken,
        registerForPush,
        openExternalLink,
    };

    return (
        <NativeAppContext.Provider value={value}>
            {children}
        </NativeAppContext.Provider>
    );
}

export function useNativeAppContext() {
    const context = useContext(NativeAppContext);
    if (context === undefined) {
        throw new Error('useNativeAppContext must be used within a NativeAppProvider');
    }
    return context;
}

export default NativeAppProvider;
