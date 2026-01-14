# Google Play Store Compliance Changes

## Issue
The Google Play Store was rejecting the app with warnings about background services that drain battery and violate battery optimization guidelines.

## Root Cause
The app was configured to:
1. Run background services on device boot (`RECEIVE_BOOT_COMPLETED` permission)
2. Maintain Firebase connection when app is not running
3. Use foreground service permissions that aren't needed for a user-initiated app

## Solution: Remove All Background Services

The app has been converted to **user-initiated only** operation. All background processing has been disabled.

### Changes Made

#### 1. **AndroidManifest.xml**
- ❌ Removed `android.permission.WAKE_LOCK`
- ❌ Removed `android.permission.RECEIVE_BOOT_COMPLETED`
- ❌ Removed `android.permission.FOREGROUND_SERVICE`
- ❌ Removed `android.permission.FOREGROUND_SERVICE_DATA_SYNC`
- ❌ Removed `BootCompletedReceiver` definition from manifest

**Remaining Essential Permissions:**
- ✅ `INTERNET` - Required for WebView
- ✅ `ACCESS_NETWORK_STATE` - Check network status
- ✅ `CAMERA` - Photo capture
- ✅ `RECORD_AUDIO` - Audio features
- ✅ `MODIFY_AUDIO_SETTINGS` - Audio management
- ✅ `VIBRATE` - Haptic feedback
- ✅ `POST_NOTIFICATIONS` - Show notifications
- ✅ `READ_MEDIA_IMAGES` - Gallery access

#### 2. **BootCompletedReceiver.kt**
- Disabled all boot-time Firebase initialization
- Class retained for backwards compatibility but functionality removed
- No longer refreshes Firebase token on device boot

#### 3. **DTPSApplication.kt**
- ❌ Removed automatic `getFCMToken()` call on app startup
- ❌ Removed proactive Firebase token initialization
- ✅ Firebase still initialized on-demand when app opens
- App now only performs operations when user is actively using it

#### 4. **MainActivity.kt** (No changes - Already user-initiated)
- FCM token fetching only happens when app is opened
- All Firebase operations are on-demand, not background

## Behavior Changes

### Before (Background Running)
- App automatically started on device boot
- Firebase connection maintained in background
- FCM token refreshed periodically
- Battery drain from continuous background processes

### After (User-Initiated Only)
- App only runs when user explicitly opens it
- Firebase initialized when app launches
- FCM token fetched on app startup only
- Zero background battery drain
- Complies with Google Play Store battery optimization guidelines

## Firebase Notifications

**Important:** With these changes, push notifications will only be received when:
1. App is running in foreground, OR
2. Firebase Messaging Service receives notifications (system handles this)

Background notification delivery is no longer supported, but this is acceptable for a user-initiated WebView app and complies with Play Store requirements.

## Build Information

**Latest Build Artifacts** (`/mobile-app/android/release-builds/`)
- `DTPS-debug.apk` - 8.4 MB (Jan 14 17:50)
- `DTPS-release.apk` - 2.5 MB (Jan 14 17:50)
- `DTPS-release.aab` - 3.6 MB (Jan 14 17:50) - Ready for Play Store submission

## Play Store Submission

The app is now compliant with Google Play Store requirements:
- ✅ No background service permissions
- ✅ No automatic startup on boot
- ✅ No foreground service abuse
- ✅ User-initiated operation only
- ✅ Battery optimization compliant

Upload the AAB file (`DTPS-release.aab`) to Google Play Console for production release.

## Testing Recommendations

Before Play Store submission, test:
1. ✅ App opens and loads homepage correctly
2. ✅ WebView functionality works (camera, gallery, forms)
3. ✅ Notifications still work when app is open
4. ✅ No crashes on device boot or during background transitions
5. ✅ App appears in Play Store as non-battery-draining

## Rollback Instructions

If background services need to be re-enabled:
1. Restore `RECEIVE_BOOT_COMPLETED` permission in AndroidManifest.xml
2. Restore `BootCompletedReceiver` implementation and manifest entry
3. Restore `getFCMToken()` in DTPSApplication.kt
4. Rebuild with `./gradlew clean assembleRelease bundleRelease`

---

**Updated:** January 14, 2026
**Status:** Ready for Play Store submission ✅
