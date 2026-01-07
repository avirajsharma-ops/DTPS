# 🔔 Push Notification System - Complete Guide

This document explains how push notifications work in the DTPS app, step by step.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Step-by-Step Flow](#step-by-step-flow)
4. [Code Breakdown](#code-breakdown)
5. [API Endpoints](#api-endpoints)
6. [Testing Notifications](#testing-notifications)

---

## Overview

The DTPS app uses **Firebase Cloud Messaging (FCM)** to send push notifications to users. It supports:

- **Web browsers** (Chrome, Firefox, Safari)
- **Android WebView app** (native Android wrapper)
- **Foreground notifications** (toast messages when app is open)
- **Background notifications** (system notifications when app is closed)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PUSH NOTIFICATION FLOW                          │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   BACKEND    │───▶│   FIREBASE   │───▶│   DEVICE     │───▶│    USER      │
│   (Next.js)  │    │   (FCM)      │    │   (Web/App)  │    │   SEES IT    │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
      │                    │                   │                    │
      │  1. Send           │  2. Firebase      │  3. Device         │  4. User
      │     notification   │     delivers      │     receives       │     sees
      │     via FCM API    │     to device     │     & displays     │     toast/
      │                    │                   │                    │     notification
```

---

## Step-by-Step Flow

### **Step 1: User Opens App & Registers for Notifications**

When user opens the app:
1. App requests notification permission
2. App gets FCM token from Firebase
3. App sends token to backend to save in database

```
User Opens App
      │
      ▼
┌─────────────────┐
│ Request         │
│ Permission      │
└─────────────────┘
      │
      ▼ (User clicks "Allow")
┌─────────────────┐
│ Get FCM Token   │
│ from Firebase   │
└─────────────────┘
      │
      ▼
┌─────────────────┐
│ Send Token to   │
│ Backend API     │
└─────────────────┘
      │
      ▼
┌─────────────────┐
│ Backend saves   │
│ token in DB     │
└─────────────────┘
```

### **Step 2: Backend Sends Notification**

When something happens (new message, appointment, etc.):
1. Backend calls Firebase Admin SDK
2. Firebase sends notification to device
3. Device receives and displays notification

```
Event Happens (e.g., New Message)
      │
      ▼
┌─────────────────┐
│ Backend gets    │
│ user's FCM      │
│ token from DB   │
└─────────────────┘
      │
      ▼
┌─────────────────┐
│ Backend calls   │
│ Firebase Admin  │
│ SDK with token  │
└─────────────────┘
      │
      ▼
┌─────────────────┐
│ Firebase sends  │
│ notification    │
│ to device       │
└─────────────────┘
      │
      ▼
┌─────────────────────────────────────┐
│          DEVICE RECEIVES            │
├─────────────────┬───────────────────┤
│ App in          │ App in            │
│ FOREGROUND      │ BACKGROUND        │
├─────────────────┼───────────────────┤
│ Shows TOAST     │ Shows SYSTEM      │
│ inside app      │ NOTIFICATION      │
└─────────────────┴───────────────────┘
```

---

## Code Breakdown

### **1. FCM Token Registration (Frontend)**

**File:** `src/hooks/usePushNotifications.ts`

This hook handles:
- Checking if browser supports notifications
- Requesting permission
- Getting FCM token
- Sending token to backend

```typescript
// Simplified version of the hook
export function usePushNotifications() {
  
  // 1. Check if notifications are supported
  const isSupported = 'Notification' in window;
  
  // 2. Request permission from user
  const requestPermission = async () => {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  };
  
  // 3. Get FCM token and register with backend
  const registerToken = async () => {
    // Get token from Firebase
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    
    // Send to backend
    await fetch('/api/fcm/token', {
      method: 'POST',
      body: JSON.stringify({ token, deviceType: 'web' })
    });
  };
  
  return { isSupported, requestPermission, registerToken };
}
```

### **2. Token Storage API (Backend)**

**File:** `src/app/api/fcm/token/route.ts`

This API saves the FCM token to the database:

```typescript
// POST /api/fcm/token
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const { token, deviceType } = await request.json();
  
  // Save token to user's record in database
  await User.findByIdAndUpdate(session.user.id, {
    $addToSet: {
      fcmTokens: {
        token,
        deviceType,
        createdAt: new Date()
      }
    }
  });
  
  return Response.json({ success: true });
}
```

### **3. Sending Notifications (Backend)**

**File:** `src/lib/firebase/firebaseAdmin.ts`

This file uses Firebase Admin SDK to send notifications:

```typescript
import admin from 'firebase-admin';

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY
    })
  });
}

// Function to send notification
export async function sendPushNotification(
  tokens: string[],      // FCM tokens to send to
  title: string,         // Notification title
  body: string,          // Notification body
  data?: object          // Extra data (type, url, etc.)
) {
  const message = {
    notification: { title, body },
    data: data || {},
    tokens: tokens
  };
  
  const response = await admin.messaging().sendEachForMulticast(message);
  return response;
}
```

### **4. Example: Sending Message Notification**

**File:** `src/app/api/messages/route.ts` (simplified)

When a new message is sent:

```typescript
export async function POST(request: Request) {
  const { receiverId, content } = await request.json();
  
  // 1. Save message to database
  const message = await Message.create({
    sender: session.user.id,
    receiver: receiverId,
    content
  });
  
  // 2. Get receiver's FCM tokens
  const receiver = await User.findById(receiverId);
  const tokens = receiver.fcmTokens.map(t => t.token);
  
  // 3. Send push notification
  if (tokens.length > 0) {
    await sendPushNotification(
      tokens,
      `New message from ${session.user.name}`,
      content,
      { 
        type: 'message',
        conversationId: message.conversationId,
        clickAction: `/messages/${message.conversationId}`
      }
    );
  }
  
  return Response.json({ success: true, message });
}
```

### **5. Foreground Notification Handler (Frontend)**

**File:** `src/components/providers/PushNotificationProvider.tsx`

When app is open and receives notification, show a toast:

```typescript
export function PushNotificationProvider({ children }) {
  
  // Handle notification when app is in foreground
  const handleForegroundNotification = (payload) => {
    const title = payload.notification?.title || 'Notification';
    const body = payload.notification?.body || '';
    const type = payload.data?.type || 'general';
    
    // Show toast notification
    toast(title, {
      description: body,
      icon: type === 'message' ? '💬' : 
            type === 'appointment' ? '📅' :
            type === 'meal' ? '🍽️' :
            type === 'payment' ? '💳' : '🔔',
      action: {
        label: 'View',
        onClick: () => {
          window.location.href = payload.data?.clickAction;
        }
      }
    });
  };
  
  // Listen for foreground messages
  useEffect(() => {
    const unsubscribe = onMessage(messaging, handleForegroundNotification);
    return () => unsubscribe();
  }, []);
  
  return <>{children}</>;
}
```

### **6. Android Native App Handler**

**File:** `mobile-app/android/.../DTPSFirebaseMessagingService.kt`

For Android WebView app:

```kotlin
class DTPSFirebaseMessagingService : FirebaseMessagingService() {
  
  override fun onMessageReceived(remoteMessage: RemoteMessage) {
    val title = remoteMessage.data["title"] ?: "DTPS"
    val body = remoteMessage.data["body"] ?: ""
    
    // If app is in foreground, send to WebView for toast
    if (isAppInForeground()) {
      sendForegroundNotificationToWebView(title, body, remoteMessage.data)
    }
    
    // Always show system notification
    showNotification(title, body, remoteMessage.data)
  }
  
  private fun sendForegroundNotificationToWebView(title: String, body: String, data: Map<String, String>) {
    // Send broadcast to MainActivity
    val intent = Intent(ACTION_FOREGROUND_NOTIFICATION)
    intent.putExtra("notification_data", JSONObject(data).toString())
    LocalBroadcastManager.getInstance(this).sendBroadcast(intent)
  }
}
```

**File:** `mobile-app/android/.../MainActivity.kt`

MainActivity receives broadcast and forwards to WebView:

```kotlin
// Broadcast receiver for foreground notifications
private val foregroundNotificationReceiver = object : BroadcastReceiver() {
  override fun onReceive(context: Context?, intent: Intent?) {
    val notificationData = intent?.getStringExtra("notification_data")
    
    // Forward to WebView via JavaScript
    webView.evaluateJavascript("""
      window.onForegroundNotification($notificationData);
    """, null)
  }
}
```

---

## API Endpoints

### **1. Register FCM Token**

```
POST /api/fcm/token
```

**Request Body:**
```json
{
  "token": "fcm_token_string_here",
  "deviceType": "web" | "android" | "ios",
  "deviceInfo": "Chrome on Windows"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token registered successfully"
}
```

### **2. Unregister FCM Token**

```
DELETE /api/fcm/token
```

**Request Body:**
```json
{
  "token": "fcm_token_to_remove"
}
```

### **3. Send Notification (Admin)**

```
POST /api/notifications/send
```

**Request Body:**
```json
{
  "userIds": ["user_id_1", "user_id_2"],
  "title": "Hello!",
  "message": "This is a notification",
  "type": "general",
  "clickAction": "/dashboard"
}
```

---

## Testing Notifications

### **Test from Browser Console:**

```javascript
// Check if notifications are supported
console.log('Supported:', 'Notification' in window);

// Check current permission
console.log('Permission:', Notification.permission);

// Request permission
Notification.requestPermission().then(p => console.log('Result:', p));
```

### **Test from Backend (Node.js):**

```javascript
// In a test API route or script
import { sendPushNotification } from '@/lib/firebase/firebaseAdmin';

// Send test notification
await sendPushNotification(
  ['USER_FCM_TOKEN_HERE'],
  'Test Notification',
  'This is a test message',
  { type: 'test', url: '/dashboard' }
);
```

### **Test from Admin Panel:**

1. Go to Admin Dashboard
2. Navigate to Notifications section
3. Select users
4. Enter title and message
5. Click Send

---

## Notification Types

| Type | Icon | Description |
|------|------|-------------|
| `message` | 💬 | New chat message |
| `appointment` | 📅 | Appointment booked/reminder |
| `meal` | 🍽️ | Meal plan created/updated |
| `payment` | 💳 | Payment request/confirmation |
| `task` | ✅ | Task assigned |
| `general` | 🔔 | General notification |

---

## Environment Variables Required

```env
# Firebase Web Config
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key

# Firebase Admin (Backend)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

---

## Summary

1. **User opens app** → Requests permission → Gets FCM token → Saves to backend
2. **Event happens** → Backend gets user's token → Sends via Firebase → Device receives
3. **App in foreground** → Shows toast notification inside app
4. **App in background** → Shows system notification in notification tray

That's the complete push notification flow! 🎉
