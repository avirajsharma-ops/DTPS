'use client';

import { useEffect, useState, useCallback } from 'react';

// Declare global NativeApp interface for Android WebView
declare global {
  interface Window {
    NativeApp?: {
      getFCMToken: () => string;
      isNativeApp: () => boolean;
      getDeviceType: () => string;
      requestNotificationPermission: () => void;
    };
  }
}

interface UseNativeAppReturn {
  isNativeApp: boolean;
  deviceType: 'android' | 'ios' | 'web';
  fcmToken: string | null;
  requestNotificationPermission: () => void;
  isLoading: boolean;
}

export function useNativeApp(): UseNativeAppReturn {
  const [isNativeApp, setIsNativeApp] = useState(false);
  const [deviceType, setDeviceType] = useState<'android' | 'ios' | 'web'>('web');
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if running in native app
    const checkNativeApp = () => {
      if (typeof window !== 'undefined' && window.NativeApp) {
        try {
          const isNative = window.NativeApp.isNativeApp();
          setIsNativeApp(isNative);
          
          if (isNative) {
            const type = window.NativeApp.getDeviceType();
            setDeviceType(type === 'android' ? 'android' : type === 'ios' ? 'ios' : 'web');
            
            // Get FCM token
            const token = window.NativeApp.getFCMToken();
            if (token) {
              setFcmToken(token);
            }
          }
        } catch (error) {
          console.error('Error checking native app:', error);
        }
      }
      setIsLoading(false);
    };

    // Small delay to ensure NativeApp interface is ready
    const timer = setTimeout(checkNativeApp, 100);
    return () => clearTimeout(timer);
  }, []);

  const requestNotificationPermission = useCallback(() => {
    if (typeof window !== 'undefined' && window.NativeApp) {
      try {
        window.NativeApp.requestNotificationPermission();
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    }
  }, []);

  return {
    isNativeApp,
    deviceType,
    fcmToken,
    requestNotificationPermission,
    isLoading,
  };
}

export default useNativeApp;
