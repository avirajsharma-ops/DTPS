'use client';

/**
 * Cross-platform haptic feedback utility
 * Works on iOS, Android (WebView), and browsers that support the Vibration API
 */

// Haptic feedback types
export type HapticType = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

// Vibration patterns (in milliseconds)
const VIBRATION_PATTERNS: Record<HapticType, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 30,
  selection: 10,
  success: [10, 50, 10],
  warning: [20, 50, 20],
  error: [30, 50, 30, 50, 30],
};

// Declare native app interfaces
declare global {
  interface Window {
    NativeApp?: {
      getFCMToken: () => string;
      isNativeApp: () => boolean;
      getDeviceType: () => string;
      requestNotificationPermission: () => void;
      refreshFCMToken: () => void;
      triggerHaptic: (type: string) => void;
      log: (message: string) => void;
    };
    webkit?: {
      messageHandlers?: {
        nativeInterface?: {
          postMessage: (message: any) => void;
        };
        haptic?: {
          postMessage: (message: any) => void;
        };
      };
    };
  }
}

/**
 * Check if haptic feedback is available
 */
export function isHapticsSupported(): boolean {
  if (typeof window === 'undefined') return false;

  // Check for Android native app haptics support
  if (window.NativeApp?.triggerHaptic) return true;

  // Check for iOS webkit haptics support
  if (window.webkit?.messageHandlers?.nativeInterface) return true;

  // Check for Vibration API
  if ('vibrate' in navigator) return true;

  return false;
}

/**
 * Trigger haptic feedback
 * @param type - Type of haptic feedback
 */
export function triggerHaptic(type: HapticType = 'light'): void {
  if (typeof window === 'undefined') return;

  try {
    // Try Android native app haptics first
    if (window.NativeApp?.triggerHaptic) {
      window.NativeApp.triggerHaptic(type);
      return;
    }

    // Try iOS webkit native interface
    if (window.webkit?.messageHandlers?.nativeInterface) {
      window.webkit.messageHandlers.nativeInterface.postMessage({
        action: 'triggerHaptic',
        type: type
      });
      return;
    }

    // Fallback to Vibration API (works on Android Chrome, some browsers)
    if ('vibrate' in navigator) {
      const pattern = VIBRATION_PATTERNS[type] || VIBRATION_PATTERNS.light;
      navigator.vibrate(pattern);
      return;
    }
  } catch (error) {
    // Silently fail if haptics not supported
  }
}

/**
 * Trigger light haptic feedback (for navigation taps)
 */
export function hapticLight(): void {
  triggerHaptic('light');
}

/**
 * Trigger medium haptic feedback
 */
export function hapticMedium(): void {
  triggerHaptic('medium');
}

/**
 * Trigger heavy haptic feedback
 */
export function hapticHeavy(): void {
  triggerHaptic('heavy');
}

/**
 * Trigger selection haptic feedback (for tab/item selection)
 */
export function hapticSelection(): void {
  triggerHaptic('selection');
}

/**
 * Trigger success haptic feedback
 */
export function hapticSuccess(): void {
  triggerHaptic('success');
}

/**
 * Trigger warning haptic feedback
 */
export function hapticWarning(): void {
  triggerHaptic('warning');
}

/**
 * Trigger error haptic feedback
 */
export function hapticError(): void {
  triggerHaptic('error');
}

/**
 * Custom hook-like function to get haptic handlers
 */
export function useHaptics() {
  return {
    isSupported: isHapticsSupported,
    trigger: triggerHaptic,
    light: hapticLight,
    medium: hapticMedium,
    heavy: hapticHeavy,
    selection: hapticSelection,
    success: hapticSuccess,
    warning: hapticWarning,
    error: hapticError,
  };
}

export default triggerHaptic;
