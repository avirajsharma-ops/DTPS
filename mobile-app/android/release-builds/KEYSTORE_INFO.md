# DTPS Release Keystore Information

⚠️ **IMPORTANT: KEEP THIS FILE SECURE AND NEVER SHARE PUBLICLY**

## Keystore Details

| Field | Value |
|-------|-------|
| **Keystore File** | `dtps-release.keystore` |
| **Keystore Password** | `DtpsApp2025` |
| **Key Alias** | `dtps-key` |
| **Key Password** | `DtpsApp2025` |
| **Validity** | 10,000 days (~27 years) |
| **Algorithm** | RSA 2048-bit |

## Organization Details
- **Common Name (CN):** DTPS App
- **Organization Unit (OU):** DTPS
- **Organization (O):** DTPS Dietary
- **City (L):** Mumbai
- **State (ST):** Maharashtra
- **Country (C):** IN

## Build Files Created (v2.0.0)

| File | Size | Purpose |
|------|------|---------|
| `DTPS-v2.0.0-debug.apk` | ~8.9 MB | Testing/Development |
| `DTPS-v2.0.0-release.apk` | ~2.6 MB | Direct distribution |
| `DTPS-v2.0.0-release.aab` | ~3.8 MB | **Play Store Upload** |
| `dtps-release.keystore` | ~2.7 KB | Signing key (BACKUP!) |

## Play Store Upload Instructions

1. **Upload AAB file:** `DTPS-v2.0.0-release.aab`
2. **Version Code:** 1
3. **Version Name:** 2.0.0
4. **Target SDK:** 35 (Android 15)
5. **Min SDK:** 24 (Android 7.0)

## SDK & Dependencies Used

| Component | Version |
|-----------|---------|
| Android Gradle Plugin | 8.8.0 |
| Kotlin | 2.1.0 |
| Compile SDK | 35 |
| Target SDK | 35 |
| Min SDK | 24 |
| Firebase BOM | 33.8.0 |
| AndroidX Core | 1.15.0 |
| Material Design | 1.12.0 |
| WebKit | 1.13.0 |
| Splashscreen | 1.2.0-alpha02 |

## ⚠️ Critical Notes

1. **BACKUP THE KEYSTORE FILE** - You cannot update your app on Play Store without it!
2. Store passwords securely (use a password manager)
3. This keystore is used to sign all future updates
4. If you lose this keystore, you'll need to create a new app listing

## Commands for Future Builds

```bash
# Debug APK
./gradlew assembleDebug

# Release APK
./gradlew assembleRelease

# Release AAB (for Play Store)
./gradlew bundleRelease
```

---
Generated: January 21, 2026
