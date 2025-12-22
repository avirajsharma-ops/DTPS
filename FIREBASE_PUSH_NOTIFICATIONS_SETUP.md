# 🔥 Firebase Push Notifications Setup Guide

This guide explains how to set up Firebase Cloud Messaging (FCM) for push notifications in the DTPS application.

## 📋 Quick Start Checklist

- [ ] Create Firebase project at console.firebase.google.com
- [ ] Add Web app to get public credentials
- [ ] Generate Web Push certificate for VAPID key
- [ ] Download service account JSON for backend
- [ ] Add all environment variables to `.env`
- [ ] Update `firebase-messaging-sw.js` with your config
- [ ] Test with the notification toggle component

---

## 🔐 Required Environment Variables

Add these to your `.env` file:

### Backend (Firebase Admin SDK) - For sending notifications

```env
# Firebase Admin SDK Credentials (from Service Account JSON)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

### Frontend (Firebase Client SDK) - For receiving notifications

```env
# Firebase Web App Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# Web Push VAPID Key (from Cloud Messaging settings)
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BPjXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Optional
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

---

## 📖 Step-by-Step Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project" or select an existing project
3. Follow the setup wizard (you can disable Google Analytics if not needed)

### Step 2: Add Web App & Get Public Credentials

1. In Firebase Console, go to **Project Settings** (⚙️ icon)
2. Scroll down to "Your apps"
3. Click **Add app** → Select **Web** (</> icon)
4. Register your app with a nickname (e.g., "DTPS Web")
5. Copy the `firebaseConfig` values:

```javascript
const firebaseConfig = {
  apiKey: "...",              // → NEXT_PUBLIC_FIREBASE_API_KEY
  authDomain: "...",          // → NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  projectId: "...",           // → NEXT_PUBLIC_FIREBASE_PROJECT_ID
  storageBucket: "...",       // → NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  messagingSenderId: "...",   // → NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  appId: "...",               // → NEXT_PUBLIC_FIREBASE_APP_ID
  measurementId: "..."        // → NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID (optional)
};
```

### Step 3: Generate VAPID Key for Web Push

1. In Firebase Console, go to **Project Settings** → **Cloud Messaging** tab
2. Scroll to "Web configuration" section
3. Under "Web Push certificates", click **Generate key pair**
4. Copy the key → This is your `NEXT_PUBLIC_FIREBASE_VAPID_KEY`

### Step 4: Download Service Account JSON (Backend)

1. In Firebase Console, go to **Project Settings** → **Service accounts** tab
2. Click **Generate new private key**
3. Download the JSON file
4. Extract these values:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (keep the \n characters)

**⚠️ Important for FIREBASE_PRIVATE_KEY:**
- Copy the entire key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
- Keep it in one line with `\n` for newlines
- Wrap in double quotes in `.env` file

### Step 5: Update Service Worker

Edit `public/firebase-messaging-sw.js` and replace the placeholder values:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};
```

---

## 🧪 Testing Your Setup

### 1. Run the Test Script

```bash
node scripts/test-firebase-setup.js
```

This will verify all credentials are properly configured.

### 2. Test API Endpoint

```bash
# Check if Firebase is connected
curl http://localhost:3000/api/fcm/send
```

### 3. Use the Notification Toggle Component

Add to your settings page:

```tsx
import { PushNotificationToggle } from '@/components/notifications/PushNotificationToggle';

// In your component
<PushNotificationToggle showTestButton={true} />
```

### 4. Send Test Notification (After Login)

```bash
curl -X POST http://localhost:3000/api/fcm/send \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{"title": "Test", "body": "Hello from DTPS!"}'
```

---

## 🏗️ Architecture

### Files Created

```
src/
├── lib/
│   └── firebase/
│       ├── index.ts           # Server-side exports
│       ├── client.ts          # Client-side exports
│       ├── firebaseAdmin.ts   # Firebase Admin SDK initialization
│       ├── firebaseNotification.ts  # Notification sending logic
│       └── fcmHelper.ts       # Client-side token management
├── app/
│   └── api/
│       └── fcm/
│           ├── token/route.ts # Token registration endpoint
│           └── send/route.ts  # Send notification endpoint
├── hooks/
│   └── usePushNotifications.ts # React hook for notifications
├── components/
│   ├── notifications/
│   │   └── PushNotificationToggle.tsx
│   └── providers/
│       └── PushNotificationProvider.tsx
public/
└── firebase-messaging-sw.js   # Service worker for background notifications
```

### User Model (Updated)

```typescript
// Added to User schema
fcmTokens: [{
  token: String,
  deviceType: 'web' | 'android' | 'ios',
  deviceInfo: String,
  createdAt: Date,
  lastUsed: Date
}]
```

---

## 📱 Usage Examples

### Send Notification to User (Backend)

```typescript
import { sendNotificationToUser } from '@/lib/firebase';

await sendNotificationToUser(userId, {
  title: 'New Appointment',
  body: 'You have an appointment tomorrow at 10:00 AM',
  icon: '/icons/icon-192x192.png',
  data: { appointmentId: '123', type: 'appointment' },
  clickAction: '/appointments/123'
});
```

### Send Notification to Multiple Users

```typescript
import { sendNotificationToUsers } from '@/lib/firebase';

await sendNotificationToUsers(['userId1', 'userId2'], {
  title: 'Weekly Update',
  body: 'Check out your progress this week!',
});
```

### Send Notification to All Clients

```typescript
import { sendNotificationToRole } from '@/lib/firebase';

await sendNotificationToRole('client', {
  title: 'Holiday Hours',
  body: 'Our office will be closed on December 25th',
});
```

### Register for Notifications (Frontend)

```typescript
'use client';

import { usePushNotifications } from '@/hooks/usePushNotifications';

function MyComponent() {
  const { 
    isSupported,
    permission,
    isRegistered,
    requestPermission,
    registerToken 
  } = usePushNotifications();

  const handleEnable = async () => {
    await requestPermission();
    await registerToken();
  };

  return (
    <button onClick={handleEnable} disabled={!isSupported || isRegistered}>
      {isRegistered ? 'Notifications Enabled' : 'Enable Notifications'}
    </button>
  );
}
```

---

## 🔧 Troubleshooting

### "Firebase messaging not initialized"
- Check that all `FIREBASE_*` environment variables are set
- Verify the private key format includes proper newlines

### "Invalid registration token"
- Token may have expired; clear and re-register
- Check if the token was generated with the correct VAPID key

### Notifications not appearing
- Check browser notification permissions
- Verify service worker is registered: `navigator.serviceWorker.ready`
- Check browser DevTools Console for errors

### "Permission denied"
- User has blocked notifications
- Guide them to browser settings to re-enable

---

## 🚀 Production Checklist

- [ ] All environment variables set in production
- [ ] `firebase-messaging-sw.js` has production config
- [ ] HTTPS enabled (required for service workers)
- [ ] Test notification flow end-to-end
- [ ] Monitor Firebase Cloud Messaging quotas

---

## 📚 Resources

- [Firebase Console](https://console.firebase.google.com)
- [FCM Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Guide](https://firebase.google.com/docs/cloud-messaging/js/client)
