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
            App.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
                if (canGoBack) {
                    window.history.back();
                } else {
                    App.exitApp();
                }
            });
        }

        // Listen for app state changes
        App.addListener('appStateChange', ({ isActive }: { isActive: boolean }) => {
            // Trigger custom event for the web app
            window.dispatchEvent(
                new CustomEvent('appStateChange', { detail: { isActive } })
            );
        });

        // Listen for app URL open (deep links)
        App.addListener('appUrlOpen', (data: { url: string }) => {
            window.dispatchEvent(
                new CustomEvent('appUrlOpen', { detail: { url: data.url } })
            );
        });

    } catch (error) {
        console.error('Error initializing native app:', error);
    }
}

// ═══════════════════════════════════════════════════════════
// Navigation & Back Button
// ═══════════════════════════════════════════════════════════

export function setupBackButtonHandler(customHandler?: () => boolean) {
    if (!isAndroid) return;

    App.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
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
    if (isNative) {
        const status = await Network.getStatus();
        return {
            connected: status.connected,
            connectionType: status.connectionType,
        };
    }
    // Web fallback
    return {
        connected: navigator.onLine,
        connectionType: navigator.onLine ? 'wifi' : 'none',
    };
}

export function onNetworkChange(
    callback: (connected: boolean, type: string) => void
) {
    if (isNative) {
        let listener: any = null;
        Network.addListener('networkStatusChange', (status: { connected: boolean; connectionType: string }) => {
            callback(status.connected, status.connectionType);
        }).then((handle) => {
            listener = handle;
        });

        return () => {
            if (listener) {
                listener.remove();
            }
        };
    }
    // Web fallback
    const onlineHandler = () => callback(true, 'wifi');
    const offlineHandler = () => callback(false, 'none');
    
    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);

    return () => {
        window.removeEventListener('online', onlineHandler);
        window.removeEventListener('offline', offlineHandler);
    };
}

// ═══════════════════════════════════════════════════════════
// Storage (Preferences/localStorage)
// ═══════════════════════════════════════════════════════════

export async function setStorageItem(key: string, value: string) {
    if (isNative) {
        await Preferences.set({ key, value });
    } else {
        localStorage.setItem(key, value);
    }
}

export async function getStorageItem(key: string): Promise<string | null> {
    if (isNative) {
        const { value } = await Preferences.get({ key });
        return value || null;
    }
    return localStorage.getItem(key);
}

export async function removeStorageItem(key: string) {
    if (isNative) {
        await Preferences.remove({ key });
    } else {
        localStorage.removeItem(key);
    }
}

export async function clearStorage() {
    if (isNative) {
        await Preferences.clear();
    } else {
        localStorage.clear();
    }
}

// ═══════════════════════════════════════════════════════════
// Push Notifications
// ═══════════════════════════════════════════════════════════

export async function registerPushNotifications() {
    if (!isNative) {
        return null;
    }

    try {
        // Request permission
        const permStatus = await PushNotifications.requestPermissions();

        if (permStatus.receive !== 'granted') {
            return null;
        }

        // Register with FCM/APNs
        await PushNotifications.register();

        // Get token
        return new Promise<string>((resolve) => {
            PushNotifications.addListener('registration', (token: { value: string }) => {
                resolve(token.value);
            });

            PushNotifications.addListener('registrationError', (error: any) => {
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

    let listener: any = null;
    PushNotifications.addListener(
        'pushNotificationReceived',
        callback
    ).then((handle) => {
        listener = handle;
    });

    return () => {
        if (listener) {
            listener.remove();
        }
    };
}

export function onPushNotificationActionPerformed(
    callback: (action: any) => void
) {
    if (!isNative) return () => { };

    let listener: any = null;
    PushNotifications.addListener(
        'pushNotificationActionPerformed',
        callback
    ).then((handle) => {
        listener = handle;
    });

    return () => {
        if (listener) {
            listener.remove();
        }
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
    if (isNative) {
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
    // Web fallback
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) {
                resolve(null);
                return;
            }
            
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result as string;
                const base64 = dataUrl.split(',')[1];
                const format = file.type.split('/')[1] || 'jpeg';
                resolve({ base64, format, dataUrl });
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
        };
        
        input.oncancel = () => resolve(null);
        input.click();
    });
}

export async function pickImageOrCamera() {
    if (isNative) {
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
    // Web fallback - use pickImage
    return pickImage();
}

// ═══════════════════════════════════════════════════════════
// Geolocation
// ═══════════════════════════════════════════════════════════

export async function getCurrentPosition() {
    if (isNative) {
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
    // Web fallback
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve(null);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp,
                });
            },
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });
}

export async function checkLocationPermission() {
    if (isNative) {
        const status = await Geolocation.checkPermissions();
        return status.location;
    }
    // Web fallback
    if (!navigator.permissions) return 'prompt';
    try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        return result.state;
    } catch {
        return 'prompt';
    }
}

export async function requestLocationPermission() {
    if (isNative) {
        const status = await Geolocation.requestPermissions();
        return status.location;
    }
    // Web fallback
    return new Promise<string>((resolve) => {
        navigator.geolocation.getCurrentPosition(
            () => resolve('granted'),
            () => resolve('denied')
        );
    });
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
