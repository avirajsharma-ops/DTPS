'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface PushNotificationProviderProps {
    children: React.ReactNode;
    autoRegister?: boolean;
    onNotification?: (payload: any) => void;
}

/**
 * Provider component that handles push notification registration
 * Add this to your layout or a high-level component
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

    useEffect(() => {
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
    }, [autoRegister, status, isSupported, permission, registerToken]);

    return <>{children}</>;
}

export default PushNotificationProvider;
