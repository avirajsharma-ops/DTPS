import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dtps.app',
  appName: 'DTPS',
  webDir: 'public', // Just for initial setup, we use remote URL

  // Server configuration for loading external URL
  server: {
    // Load from your hosted URL (WebView mode)
    url: 'https://dtps.tech/user',
    cleartext: false, // HTTPS only
    allowNavigation: [
      'dtps.tech',
      '*.dtps.tech',
      'razorpay.com',
      '*.razorpay.com',
      'googleapis.com',
      '*.googleapis.com',
    ],
  },

  // Android specific configuration
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // Set to true for development
    backgroundColor: '#ffffff',
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'AAB',
    },
  },

  // iOS specific configuration (for future use)
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
  },

  // Plugins configuration
  plugins: {
    // Push Notifications
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },

    // Splash Screen
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerColor: '#10b981',
    },

    // Status Bar
    StatusBar: {
      style: 'light',
      backgroundColor: '#10b981',
    },

    // Keyboard
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
