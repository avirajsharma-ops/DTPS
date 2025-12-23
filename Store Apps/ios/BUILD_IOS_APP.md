# iOS Build Instructions

Since Xcode is required to build iOS apps and only Command Line Tools are installed on this machine, follow these steps to build the iOS app:

## Prerequisites
1. Install **Xcode** from the Mac App Store
2. Open Xcode and accept the license agreement
3. Install iOS Simulator (optional)

## Building the iOS App

### Step 1: Create a New Xcode Project
1. Open Xcode
2. File → New → Project
3. Choose **iOS** → **App**
4. Configure:
   - Product Name: `DTPS`
   - Team: Select your Apple Developer Team
   - Organization Identifier: `com.dtps`
   - Interface: **Storyboard**
   - Language: **Swift**
   - Uncheck "Include Tests"

### Step 2: Replace Source Files
1. Delete the default `ViewController.swift`
2. Copy these files from `Source/` folder into your project:
   - `ViewController.swift`
   - `AppDelegate.swift`
3. Replace the `Info.plist` with the provided one (or merge the permission strings)
4. Replace `LaunchScreen.storyboard` with the provided one

### Step 3: Add App Icons
1. In Xcode, open `Assets.xcassets`
2. Select `AppIcon`
3. Drag and drop all icons from `AppIcon.appiconset/` folder

### Step 4: Configure Signing
1. Select the project in Navigator
2. Select your target
3. Go to "Signing & Capabilities"
4. Select your Team
5. Enable "Automatically manage signing"

### Step 5: Build & Archive
1. Select "Any iOS Device" as the destination
2. Product → Archive
3. Window → Organizer
4. Select the archive → Distribute App
5. Choose "App Store Connect" for App Store distribution

## Files Provided

```
ios/
├── Source/
│   ├── AppDelegate.swift      # App entry point
│   ├── ViewController.swift   # Main WebView controller
│   ├── Info.plist            # App configuration & permissions
│   └── LaunchScreen.storyboard # Splash screen
├── AppIcon.appiconset/        # All app icon sizes
│   ├── Contents.json
│   └── Icon-*.png (all sizes)
└── APP_STORE_LISTING.md       # App Store metadata
```

## App Store Submission Checklist
- [ ] App icon (1024x1024) - ✅ Provided
- [ ] Screenshots (6.7", 6.5", iPad)
- [ ] App description - ✅ See APP_STORE_LISTING.md
- [ ] Privacy policy URL
- [ ] Support URL
- [ ] Marketing URL (optional)
- [ ] Keywords
- [ ] App Review notes

## Keystore Information (Android)
The Android release keystore is located at:
`build-output/dtps-release.keystore`

**Keystore Password:** `dtps2024release`
**Key Alias:** `dtps-key`
**Key Password:** `dtps2024release`

⚠️ **IMPORTANT:** Keep this keystore file safe! You'll need it for all future app updates.
