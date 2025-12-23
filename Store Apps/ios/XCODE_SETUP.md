# iOS Project Setup Guide

## Creating the Xcode Project

Since this is source code that needs to be added to an Xcode project, follow these steps:

### Step 1: Create New Project in Xcode

1. Open Xcode
2. File → New → Project
3. Select "App" under iOS
4. Configure:
   - Product Name: **DTPS**
   - Team: Your Apple Developer Team
   - Organization Identifier: **com.dtps**
   - Bundle Identifier: **com.dtps.dietary**
   - Interface: **Storyboard**
   - Language: **Swift**
   - Uncheck "Use Core Data" and "Include Tests"
5. Click Next and create the project

### Step 2: Replace Source Files

1. Delete the auto-generated files:
   - ViewController.swift
   - Main.storyboard
   - SceneDelegate.swift (if exists)

2. Copy the files from `Source/` folder:
   - `ViewController.swift`
   - `AppDelegate.swift`
   - `Info.plist` (replace the existing one)
   - `LaunchScreen.storyboard` (replace the existing one)

### Step 3: Configure Project Settings

1. Select the project in the navigator
2. Under "Deployment Info":
   - Set minimum iOS version to 13.0
   - Device: iPhone (or Universal if you want iPad)
   - Uncheck landscape orientations for iPhone

3. Under "Signing & Capabilities":
   - Select your team
   - Enable "Push Notifications" capability
   - Enable "Background Modes" → Remote notifications

### Step 4: Add App Icon

1. In the project navigator, go to Assets.xcassets
2. Select AppIcon
3. Drag your 1024x1024 app icon to the appropriate slot
   (Use the icon from `/public/icons/app-icon-original.png` - resize to 1024x1024)

### Step 5: Remove Scene Configuration (for iOS 12 support)

If you want to support iOS 12, remove these from Info.plist:
- UIApplicationSceneManifest

And ensure AppDelegate.swift has:
```swift
var window: UIWindow?
```

### Step 6: Build and Test

1. Select an iPhone simulator or connected device
2. Press Cmd+R to build and run
3. Verify the app loads https://dtps.tech/user

### Step 7: Archive for App Store

1. Select "Any iOS Device" as the target
2. Product → Archive
3. Window → Organizer
4. Select the archive → Distribute App
5. Choose "App Store Connect" → Upload

## Project Structure After Setup

```
DTPS/
├── DTPS/
│   ├── AppDelegate.swift
│   ├── ViewController.swift
│   ├── Info.plist
│   ├── LaunchScreen.storyboard
│   └── Assets.xcassets/
│       └── AppIcon.appiconset/
├── DTPS.xcodeproj
└── (other auto-generated files)
```

## Permissions Included

The Info.plist includes:
- ✅ Camera usage description
- ✅ Microphone usage description
- ✅ Photo library usage description
- ✅ Photo library add usage description
- ✅ Background modes (remote-notification)

## Features

- ✅ WebView loading https://dtps.tech/user
- ✅ White status bar with dark icons
- ✅ Loading progress indicator (green)
- ✅ Offline detection with retry button
- ✅ Back/forward swipe gestures
- ✅ JavaScript alerts and confirms
- ✅ External links open in Safari
- ✅ Notification permission request on launch
- ✅ Camera and microphone support for WebRTC
