# DTPS Android App - Play Store Publishing Guide

## 📦 Build Files (Version 1.5.0 - versionCode 6)

**Location:** `/mobile-app/android/release-builds/`

| File | Size | Purpose |
|------|------|---------|
| `DTPS-v1.5.0.aab` | 3.8 MB | **Upload to Play Store** |
| `DTPS-v1.5.0-release.apk` | 2.5 MB | Direct install (signed) |
| `DTPS-v1.5.0-debug.apk` | 8.8 MB | Testing only |
| `dtps-release.keystore` | 2.7 KB | Signing keystore |

---

## 🔐 Keystore Information

| Property | Value |
|----------|-------|
| **File** | `dtps-release.keystore` |
| **Alias** | `dtps-key` |
| **Password** | `dtps2024secure` |
| **Valid Until** | June 6, 2053 |
| **Owner** | CN=DTPS Dietary, OU=Mobile, O=DTPS, L=India, ST=India, C=IN |

⚠️ **IMPORTANT:** Keep this keystore safe! You need it for ALL future app updates.

---

## 🚨 FIXING THE PLAY CONSOLE ERROR

### Error: "You must let us know whether your app uses any Foreground Service permissions"

**This is NOT a code error.** This is a declaration you must complete in Google Play Console.

### Step-by-Step Fix:

1. **Click "Go to declaration"** in the error message
2. You will see a form asking about Foreground Service usage
3. **Select: "No, my app does NOT use Foreground Service permissions"**
4. **Save the declaration**
5. Go back to your release and the error will be gone

### Why This Declaration is Required:
Google Play requires all apps to declare whether they use Foreground Services (like music players, GPS tracking, etc.). Your WebView app does NOT use foreground services, so you must tell Google this.

---

## 📋 Complete Play Console Checklist

### Step 1: Upload AAB
1. Go to **Google Play Console** → Your App → **Testing** → **Closed testing**
2. Click **"Create new release"**
3. Upload: `DTPS-v1.5.0.aab`
4. Release notes:
```
Version 1.5.0 (Build 6)
• Performance improvements
• Bug fixes and stability enhancements
• Improved notification handling
```

### Step 2: Complete Foreground Service Declaration
1. Click **"Go to declaration"** from the error
2. Select: **"No, my app does NOT use Foreground Service permissions"**
3. Click **Save**

### Step 3: Complete Photo/Video Declaration (if asked)
If asked about photo/video permissions, use these descriptions:

**Camera Permission:**
```
The DTPS Dietary app requires camera access to allow users to:
- Upload meal photos to track daily food intake for dietitian review
- Take profile pictures for their user account
- Share progress photos with their assigned dietitian

Camera is only activated when users tap the camera button. Photos are securely sent to the DTPS server for dietitian review.
```

**Photo/Media Access:**
```
The DTPS Dietary app requires photo access to allow users to:
- Select existing meal photos from gallery to log food intake
- Upload progress photos showing health/fitness journey
- Choose profile pictures from saved photos

Access is only used when users choose to upload images. All photos are securely transmitted and never shared with third parties.
```

**Microphone/Audio:**
```
The DTPS Dietary app requires microphone access for video consultation calls between clients and dietitians/health counselors. Audio is only activated during scheduled video appointments initiated by the user.
```

### Step 4: Review & Submit
1. Click **"Review release"**
2. Verify all errors show green checkmarks ✅
3. Click **"Start rollout to Closed testing"**

---

## 📱 App Permissions Summary

### ✅ Permissions Used:
| Permission | Why Needed | When Activated |
|------------|-----------|----------------|
| INTERNET | Load WebView app | Always |
| ACCESS_NETWORK_STATE | Check connectivity | Always |
| CAMERA | Meal/progress photos | User taps camera |
| READ_MEDIA_IMAGES | Select photos from gallery | User selects photo |
| RECORD_AUDIO | Video consultations | During video calls |
| MODIFY_AUDIO_SETTINGS | Audio management | During calls |
| POST_NOTIFICATIONS | Push notifications | When notification arrives |
| VIBRATE | Notification alerts | With notifications |

### ❌ Permissions NOT Used:
- ❌ FOREGROUND_SERVICE - Not used
- ❌ BACKGROUND_SERVICE - Not used
- ❌ BOOT_COMPLETED - Not used
- ❌ WAKE_LOCK - Not used

---

## 🔧 Build Information

| Property | Value |
|----------|-------|
| **Version Name** | 1.5.0 |
| **Version Code** | 6 |
| **Min SDK** | 24 (Android 7.0) |
| **Target SDK** | 35 (Android 15) |
| **Compile SDK** | 35 |
| **Package Name** | first.dtps.com |

---

## ✅ Pre-Publish Checklist

- [x] Version code 6 (higher than previous)
- [x] Single AAB file created
- [x] Single keystore file
- [x] Release APK created
- [x] Debug APK created
- [x] No foreground service permissions in manifest
- [x] No background service permissions
- [x] Clean build with no warnings
- [ ] Upload AAB to Play Console
- [ ] Complete Foreground Service declaration → Select "No"
- [ ] Complete Photo/Video declaration (if asked)
- [ ] Submit for review

---

## 🔄 How to Rebuild (If Needed)

```bash
cd /Users/apple/Desktop/DTPS/mobile-app/android

# Clean old builds
bash gradlew clean

# Build all files
bash gradlew assembleRelease assembleDebug bundleRelease

# Files will be in:
# - app/build/outputs/bundle/release/app-release.aab
# - app/build/outputs/apk/release/app-release.apk
# - app/build/outputs/apk/debug/app-debug.apk
```

---

## 📞 Troubleshooting

### "Foreground Service declaration" error keeps appearing
→ You must click "Go to declaration" and select "No" in Play Console. This is not a code fix.

### "Existing users can't upgrade"
→ Increase versionCode in `app/build.gradle` and rebuild

### "App bundle not added"
→ Upload the `.aab` file, not `.apk`

### Keystore issues
→ Use the keystore in `release-builds/dtps-release.keystore` with password `dtps2024secure`

---

**Last Updated:** January 19, 2026  
**Version:** 1.5.0 (versionCode: 6)  
**Status:** Ready for Play Store ✅
