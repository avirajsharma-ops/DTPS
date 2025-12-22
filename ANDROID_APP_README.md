# 📱 DTPS Android WebView App

This document provides complete information about the DTPS Android WebView application.

## 📦 Build Output

The following **signed** files are available in the `build-output/` folder:

| File | Size | Purpose |
|------|------|---------|
| `DTPS-signed.apk` | ~45 MB | ✅ **Signed Release APK** - Ready for installation |
| `DTPS-signed.aab` | ~43 MB | ✅ **Signed AAB** - Ready for Play Store upload |
| `DTPS-debug-signed.apk` | ~46 MB | ✅ **Signed Debug APK** - For testing |

### 🔐 Signing Certificate

The app is signed with a self-signed certificate:
- **Keystore**: `android/dtps-release-key.jks`
- **Alias**: `dtps-key`
- **Validity**: 10,000 days (~27 years)
- **Certificate**: CN=DTPS, OU=Development, O=DTPS

> ⚠️ **IMPORTANT**: Keep the keystore file (`dtps-release-key.jks`) safe! You'll need the same keystore to sign all future updates.

## 🚀 Installation

### Install Signed APK
```bash
# Via ADB
adb install build-output/DTPS-signed.apk

# Or transfer to phone and open the file
```

### Direct Installation on Phone
1. Transfer `DTPS-signed.apk` to your Android device
2. Open the APK file to install
3. If prompted, enable "Install from unknown sources" in Settings
4. Grant requested permissions when prompted

### Upload to Play Store
1. Go to [Google Play Console](https://play.google.com/console)
2. Create a new app or select existing
3. Upload `DTPS-signed.aab` to Production/Testing track
4. Fill in store listing details
5. Submit for review

## 🏗️ Architecture

### Technology Stack
- **Framework**: Capacitor 6.0.0
- **WebView**: Android System WebView
- **Target**: Android 14 (API 34)
- **Minimum**: Android 7.0 (API 24)

### Key Features
- ✅ WebView loads from https://dtps.tech/user
- ✅ Native back button handling
- ✅ Push notification support (FCM)
- ✅ Camera & gallery access
- ✅ Geolocation support
- ✅ File upload/download
- ✅ Offline detection
- ✅ Deep linking
- ✅ Session persistence

## 📁 Project Structure

```
android/
├── app/
│   ├── src/main/
│   │   ├── java/com/dtps/app/
│   │   │   └── MainActivity.java
│   │   ├── res/
│   │   │   ├── drawable/
│   │   │   ├── mipmap-*/
│   │   │   ├── values/
│   │   │   │   ├── colors.xml
│   │   │   │   ├── strings.xml
│   │   │   │   └── styles.xml
│   │   │   └── xml/
│   │   │       └── network_security_config.xml
│   │   └── AndroidManifest.xml
│   └── build.gradle
├── gradle/
├── build.gradle
├── settings.gradle
└── variables.gradle

src/lib/native/
└── capacitor-bridge.ts    # Native bridge utilities

src/hooks/
└── useNativeApp.ts        # React hook for native features

src/components/
├── providers/
│   └── NativeAppProvider.tsx
└── native/
    ├── OfflineFallback.tsx
    └── NetworkStatusIndicator.tsx
```

## 🔧 Configuration

### capacitor.config.ts
```typescript
{
  appId: 'com.dtps.app',
  appName: 'DTPS',
  server: {
    url: 'https://dtps.tech/user',
    allowNavigation: [
      'dtps.tech',
      '*.dtps.tech',
      'razorpay.com',
      '*.razorpay.com',
    ],
  },
}
```

### AndroidManifest Permissions
- `INTERNET` - Network access
- `CAMERA` - Photo capture
- `RECORD_AUDIO` - Voice recording
- `ACCESS_FINE_LOCATION` - GPS
- `POST_NOTIFICATIONS` - Push notifications
- `READ_MEDIA_IMAGES` - Gallery access

## 🔨 Build Commands

```bash
# Sync web assets
npx cap sync android

# Open in Android Studio
npx cap open android

# Build debug APK
cd android && ./gradlew assembleDebug

# Build release APK & AAB
cd android && ./gradlew assembleRelease bundleRelease

# Or use the build script
node scripts/build-android.js --all
```

## 📱 Using Native Features in Web App

### Import the Hook
```tsx
import { useNativeApp } from '@/hooks/useNativeApp';

function MyComponent() {
  const {
    isNative,
    isAndroid,
    isOnline,
    openExternalLink,
    registerForPush,
  } = useNativeApp();

  // Check if running in native app
  if (isNative) {
    // Use native features
  }
}
```

### Open External Links
```tsx
import { openExternalUrl } from '@/lib/native/capacitor-bridge';

// Opens in external browser
await openExternalUrl('https://google.com');
```

### Handle Camera
```tsx
import { takePicture, pickImage } from '@/lib/native/capacitor-bridge';

const photo = await takePicture();
// photo.dataUrl contains the base64 image
```

### Check Network Status
```tsx
import { getNetworkStatus, onNetworkChange } from '@/lib/native/capacitor-bridge';

const status = await getNetworkStatus();
if (!status.connected) {
  // Show offline message
}
```

## 🔐 Security

### Network Security Config
- Only HTTPS traffic allowed
- Cleartext disabled
- Whitelisted domains only:
  - dtps.tech
  - razorpay.com
  - googleapis.com

### Data Protection
- Session stored securely
- Cookies managed by WebView
- No sensitive data in local storage

## 🐛 Debugging

### Enable WebView Debugging
In `capacitor.config.ts`:
```typescript
android: {
  webContentsDebuggingEnabled: true,
}
```

Then in Chrome:
1. Open `chrome://inspect`
2. Find your device
3. Click "inspect"

### View Logs
```bash
adb logcat | grep "chromium"
```

## 📝 Customization

### Change App Icon
Replace files in:
- `android/app/src/main/res/mipmap-mdpi/`
- `android/app/src/main/res/mipmap-hdpi/`
- `android/app/src/main/res/mipmap-xhdpi/`
- `android/app/src/main/res/mipmap-xxhdpi/`
- `android/app/src/main/res/mipmap-xxxhdpi/`

### Change Splash Screen
Edit `android/app/src/main/res/drawable/splash.xml`

### Change Colors
Edit `android/app/src/main/res/values/colors.xml`:
```xml
<color name="colorPrimary">#10B981</color>
<color name="colorPrimaryDark">#059669</color>
<color name="colorAccent">#E06A26</color>
```

## 📋 Testing Checklist

- [ ] Login works correctly
- [ ] Session persists after app restart
- [ ] Back button navigates history
- [ ] Back button exits when at root
- [ ] Camera permission prompt appears
- [ ] Photo capture works
- [ ] Gallery selection works
- [ ] File upload works
- [ ] Push notifications received
- [ ] External links open in browser
- [ ] Offline state detected
- [ ] Deep links work
- [ ] Payment flows work (Razorpay)

## 🚀 Publishing to Play Store

1. **Sign the AAB**
   ```bash
   jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
     -keystore my-release-key.keystore \
     build-output/DTPS-release.aab \
     my-key-alias
   ```

2. **Create Play Console Listing**
   - App name: DTPS
   - Package: com.dtps.app
   - Category: Health & Fitness

3. **Upload AAB**
   - Go to Play Console → Production → Create release
   - Upload `DTPS-release.aab`

4. **Submit for Review**
   - Complete store listing
   - Add screenshots
   - Submit for review

## 🔧 Troubleshooting

### "App not installed"
- Enable "Install from unknown sources"
- Uninstall previous version first

### WebView shows blank page
- Check internet connection
- Verify https://dtps.tech is accessible
- Check network security config

### Back button exits immediately
- Ensure JavaScript is enabled
- Check WebView history exists

### Camera not working
- Check permissions in settings
- Test on real device (not emulator)

---

**Package ID**: `com.dtps.app`
**Version**: 1.0.0
**Build Date**: December 22, 2025
