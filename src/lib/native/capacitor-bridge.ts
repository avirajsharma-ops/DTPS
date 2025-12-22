'use client';

import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Network } from '@capacitor/network';
import { Preferences } from '@capacitor/preferences';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { PushNotifications } from '@capacitor/push-notifications';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Filesystem, Directory } from '@capacitor/filesystem';

// ═══════════════════════════════════════════════════════════
// Platform Detection
// ═══════════════════════════════════════════════════════════

export const isNative = Capacitor.isNativePlatform();
export const isAndroid = Capacitor.getPlatform() === 'android';
export const isIOS = Capacitor.getPlatform() === 'ios';
export const isWeb = Capacitor.getPlatform() === 'web';

export function getPlatformInfo() {
    return {
        platform: Capacitor.getPlatform(),
        isNative: Capacitor.isNativePlatform(),
        isAndroid,
        isIOS,
        isWeb,
    };
}

// ═══════════════════════════════════════════════════════════
// App Lifecycle
// ═══════════════════════════════════════════════════════════

export async function initializeApp() {
    if (!isNative) return;

    try {
        // Hide splash screen after app is ready
        await SplashScreen.hide();

        // Set status bar style
        if (isAndroid) {
            await StatusBar.setBackgroundColor({ color: '#10b981' });
            await StatusBar.setStyle({ style: Style.Light });
        }

        // Set up back button handler for Android
        if (isAndroid) {
            App.addListener('backButton', ({ canGoBack }) => {
                if (canGoBack) {
                    window.history.back();
                } else {
                    App.exitApp();
                }
            });
        }

        // Listen for app state changes
        App.addListener('appStateChange', ({ isActive }) => {
            console.log('App state changed. Active:', isActive);
            // Trigger custom event for the web app
            window.dispatchEvent(
                new CustomEvent('appStateChange', { detail: { isActive } })
            );
        });

        // Listen for app URL open (deep links)
        App.addListener('appUrlOpen', (data) => {
            console.log('App URL opened:', data.url);
            window.dispatchEvent(
                new CustomEvent('appUrlOpen', { detail: { url: data.url } })
            );
        });

        console.log('Native app initialized successfully');
    } catch (error) {
        console.error('Error initializing native app:', error);
    }
}

// ═══════════════════════════════════════════════════════════
// Navigation & Back Button
// ═══════════════════════════════════════════════════════════

export function setupBackButtonHandler(customHandler?: () => boolean) {
    if (!isAndroid) return;

    App.addListener('backButton', ({ canGoBack }) => {
        // If custom handler returns true, it handled the back action
        if (customHandler && customHandler()) {
            return;
        }

        if (canGoBack) {
            window.history.back();
        } else {
            App.exitApp();
        }
    });
}

export async function exitApp() {
    if (isNative) {
        await App.exitApp();
    }
}

export async function minimizeApp() {
    if (isAndroid) {
        await App.minimizeApp();
    }
}

// ═══════════════════════════════════════════════════════════
// External Browser
// ═══════════════════════════════════════════════════════════

export async function openExternalUrl(url: string) {
    if (isNative) {
        await Browser.open({ url });
    } else {
        window.open(url, '_blank');
    }
}

export async function closeBrowser() {
    if (isNative) {
        await Browser.close();
    }
}

// ═══════════════════════════════════════════════════════════
// Network Status
// ═══════════════════════════════════════════════════════════

export async function getNetworkStatus() {
    const status = await Network.getStatus();
    return {
        connected: status.connected,
        connectionType: status.connectionType,
    };
}

export function onNetworkChange(
    callback: (connected: boolean, type: string) => void
) {
    const listener = Network.addListener('networkStatusChange', (status) => {
        callback(status.connected, status.connectionType);
    });

    return () => {
        listener.remove();
    };
}

// ═══════════════════════════════════════════════════════════
// Storage (Preferences)
// ═══════════════════════════════════════════════════════════

export async function setStorageItem(key: string, value: string) {
    await Preferences.set({ key, value });
}

export async function getStorageItem(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key });
    return value;
}

export async function removeStorageItem(key: string) {
    await Preferences.remove({ key });
}

export async function clearStorage() {
    await Preferences.clear();
}

// ═══════════════════════════════════════════════════════════
// Push Notifications
// ═══════════════════════════════════════════════════════════

export async function registerPushNotifications() {
    if (!isNative) {
        console.log('Push notifications only work on native platforms');
        return null;
    }

    try {
        // Request permission
        const permStatus = await PushNotifications.requestPermissions();

        if (permStatus.receive !== 'granted') {
            console.log('Push notification permission not granted');
            return null;
        }

        // Register with FCM/APNs
        await PushNotifications.register();

        // Get token
        return new Promise<string>((resolve) => {
            PushNotifications.addListener('registration', (token) => {
                console.log('Push registration success, token:', token.value);
                resolve(token.value);
            });

            PushNotifications.addListener('registrationError', (error) => {
                console.error('Push registration error:', error);
                resolve('');
            });
        });
    } catch (error) {
        console.error('Error registering push notifications:', error);
        return null;
    }
}

export function onPushNotificationReceived(
    callback: (notification: any) => void
) {
    if (!isNative) return () => { };

    const listener = PushNotifications.addListener(
        'pushNotificationReceived',
        callback
    );

    return () => {
        listener.remove();
    };
}

export function onPushNotificationActionPerformed(
    callback: (action: any) => void
) {
    if (!isNative) return () => { };

    const listener = PushNotifications.addListener(
        'pushNotificationActionPerformed',
        callback
    );

    return () => {
        listener.remove();
    };
}

// ═══════════════════════════════════════════════════════════
// Camera & Media
// ═══════════════════════════════════════════════════════════

export async function takePicture() {
    try {
        const image = await Camera.getPhoto({
            quality: 90,
            allowEditing: false,
            resultType: CameraResultType.Base64,
            source: CameraSource.Camera,
        });

        return {
            base64: image.base64String,
            format: image.format,
            dataUrl: `data:image/${image.format};base64,${image.base64String}`,
        };
    } catch (error) {
        console.error('Error taking picture:', error);
        return null;
    }
}

export async function pickImage() {
    try {
        const image = await Camera.getPhoto({
            quality: 90,
            allowEditing: false,
            resultType: CameraResultType.Base64,
            source: CameraSource.Photos,
        });

        return {
            base64: image.base64String,
            format: image.format,
            dataUrl: `data:image/${image.format};base64,${image.base64String}`,
        };
    } catch (error) {
        console.error('Error picking image:', error);
        return null;
    }
}

export async function pickImageOrCamera() {
    try {
        const image = await Camera.getPhoto({
            quality: 90,
            allowEditing: false,
            resultType: CameraResultType.Base64,
            source: CameraSource.Prompt,
        });

        return {
            base64: image.base64String,
            format: image.format,
            dataUrl: `data:image/${image.format};base64,${image.base64String}`,
        };
    } catch (error) {
        console.error('Error picking image:', error);
        return null;
    }
}

// ═══════════════════════════════════════════════════════════
// Geolocation
// ═══════════════════════════════════════════════════════════

export async function getCurrentPosition() {
    try {
        const position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 10000,
        });

        return {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
        };
    } catch (error) {
        console.error('Error getting location:', error);
        return null;
    }
}

export async function checkLocationPermission() {
    const status = await Geolocation.checkPermissions();
    return status.location;
}

export async function requestLocationPermission() {
    const status = await Geolocation.requestPermissions();
    return status.location;
}

// ═══════════════════════════════════════════════════════════
// File System
// ═══════════════════════════════════════════════════════════

export async function downloadFile(url: string, fileName: string) {
    if (!isNative) {
        // Fallback for web - use standard download
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return true;
    }

    try {
        // Fetch the file
        const response = await fetch(url);
        const blob = await response.blob();

        // Convert to base64
        const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                resolve(result.split(',')[1]);
            };
            reader.readAsDataURL(blob);
        });

        // Save to downloads directory
        await Filesystem.writeFile({
            path: fileName,
            data: base64,
            directory: Directory.Documents,
        });

        console.log('File downloaded:', fileName);
        return true;
    } catch (error) {
        console.error('Error downloading file:', error);
        return false;
    }
}

// ═══════════════════════════════════════════════════════════
// Session & Auth Management
// ═══════════════════════════════════════════════════════════

export async function persistSession(sessionData: any) {
    await setStorageItem('user_session', JSON.stringify(sessionData));
}

export async function getPersistedSession() {
    const session = await getStorageItem('user_session');
    return session ? JSON.parse(session) : null;
}

export async function clearSession() {
    await removeStorageItem('user_session');
    await removeStorageItem('auth_token');
}

export async function setAuthToken(token: string) {
    await setStorageItem('auth_token', token);
}

export async function getAuthToken(): Promise<string | null> {
    return await getStorageItem('auth_token');
}

// ═══════════════════════════════════════════════════════════
// Web ↔ Native Bridge Events
// ═══════════════════════════════════════════════════════════

export type NativeEvent =
    | 'login_success'
    | 'logout'
    | 'route_change'
    | 'request_camera'
    | 'request_location'
    | 'request_notifications'
    | 'open_external_link'
    | 'download_file';

export function sendToNative(event: NativeEvent, data?: any) {
    // Dispatch a custom event that native code can listen to
    window.dispatchEvent(
        new CustomEvent('webToNative', {
            detail: { event, data },
        })
    );
}

export function onNativeEvent(callback: (event: string, data: any) => void) {
    const handler = (e: CustomEvent) => {
        callback(e.detail.event, e.detail.data);
    };

    window.addEventListener('nativeToWeb', handler as EventListener);

    return () => {
        window.removeEventListener('nativeToWeb', handler as EventListener);
    };
}

// Inject data from native to web
export function injectToWeb(event: string, data: any) {
    window.dispatchEvent(
        new CustomEvent('nativeToWeb', {
            detail: { event, data },
        })
    );
}
