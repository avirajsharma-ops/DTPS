# DTPS Mobile App - Build Instructions

## ✅ Pre-Built Android Apps Available!

The Android apps have been built and are ready to use:

```
build-output/
├── DTPS-debug.apk       # Debug version (5.8 MB) - for testing
├── DTPS-release.apk     # Release version (2.1 MB) - for distribution
├── DTPS-release.aab     # Play Store bundle (2.0 MB) - for Google Play
└── dtps-release.keystore # Signing keystore (KEEP SAFE!)
```

### Keystore Credentials (SAVE THESE!)
- **Keystore Password:** `dtps2024release`
- **Key Alias:** `dtps-key`  
- **Key Password:** `dtps2024release`

⚠️ **IMPORTANT:** Keep the keystore file safe! You need it for all future updates.

---

## Android Build Instructions (If rebuilding)

### Prerequisites
1. **Android Studio** (latest version recommended)
   - Download from: https://developer.android.com/studio
   
2. **Java 17 JDK**
   - Android Studio includes this, or install separately

### Build Steps

#### Option 1: Using Android Studio (Recommended)
1. Open Android Studio
2. Click "Open" and select the `android` folder
3. Wait for Gradle sync to complete
4. To build Debug APK:
   - Build → Build Bundle(s) / APK(s) → Build APK(s)
5. To build Release APK/AAB:
   - Build → Generate Signed Bundle / APK
   - Follow the wizard to create/use a keystore

#### Option 2: Using Command Line
```bash
cd android

# Set Android SDK path (update path as needed)
export ANDROID_HOME=~/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools

# Build Debug APK
./gradlew assembleDebug

# Build Release APK (requires signing config)
./gradlew assembleRelease

# Build AAB for Play Store
./gradlew bundleRelease
```

### Output Locations
- Debug APK: `app/build/outputs/apk/debug/app-debug.apk`
- Release APK: `app/build/outputs/apk/release/app-release.apk`
- Release AAB: `app/build/outputs/bundle/release/app-release.aab`

### Signing Configuration
For release builds, add to `gradle.properties`:
```properties
RELEASE_STORE_FILE=your-keystore.jks
RELEASE_STORE_PASSWORD=your_password
RELEASE_KEY_ALIAS=your_key_alias
RELEASE_KEY_PASSWORD=your_key_password
```

### Play Store Requirements
- App icon: ✅ Included (512x512 required for store)
- Feature graphic: Create a 1024x500 banner
- Screenshots: At least 2 phone screenshots
- Privacy policy URL
- Store listing (see PLAY_STORE_LISTING.md)

---

## iOS Build Instructions

### Prerequisites
1. **macOS** with Xcode 15+
2. **Apple Developer Account** (for App Store distribution)
3. **CocoaPods** (optional, not needed for this simple WebView app)

### Build Steps

1. Open the Xcode project (or create one using the provided source files)
2. Select your team in Signing & Capabilities
3. Select "Any iOS Device" as the build target
4. Product → Archive
5. Distribute App → App Store Connect

### App Store Requirements
- App icon: Create a 1024x1024 icon
- Screenshots for various device sizes
- Privacy policy URL
- App Store listing (see APP_STORE_LISTING.md)

---

## App Configuration

### Changing the App URL
Edit `MainActivity.kt` (Android) or `ViewController.swift` (iOS):
```kotlin
private const val APP_URL = "https://dtps.tech/user"
```

### Changing App Name
- Android: `app/src/main/res/values/strings.xml`
- iOS: Info.plist → Bundle display name

### Changing Package/Bundle ID
- Android: `app/build.gradle` → `applicationId`
- iOS: Xcode → General → Bundle Identifier

---

## Features Included

✅ WebView loading https://dtps.tech/user
✅ White status bar and navigation bar
✅ Splash screen with app icon
✅ Notification permission request
✅ Camera permission for photos
✅ Microphone permission for calls
✅ File upload support
✅ Back button handling
✅ Offline detection
✅ Deep linking support
✅ Modern Material 3 theme

---

## Troubleshooting

### Android
- If Gradle sync fails, try File → Invalidate Caches
- Ensure Android SDK is up to date
- Check that Java 17 is being used

### iOS
- Clean build folder: Product → Clean Build Folder
- Delete DerivedData if issues persist
- Ensure Xcode and iOS are updated
