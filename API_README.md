# DTPS User Panel & WebView API Reference

**Complete API reference for client-side (user panel) and Android WebView app with detailed request/response specifications.**

## Base URLs

- **Production:** `https://dtps.tech`
- **Local dev:** `http://localhost:3000`
- **API base:** `<base-url>/api`

## Authentication

Most endpoints require an authenticated session (NextAuth). Include authorization header:
```
Authorization: Bearer <session_token>
```

---

# 📋 DETAILED API SPECIFICATIONS

## Data Types Reference

| Type | Format | Example |
|------|--------|---------|
| string | Text | "John Doe" |
| number | Integer/Float | 123 or 123.45 |
| boolean | true/false | true, false |
| date | YYYY-MM-DD | "2025-01-19" |
| datetime | ISO 8601 | "2025-01-19T10:30:00Z" |
| email | Email format | "user@example.com" |
| phone | +CCXXXXXXXXXX | "+919876543210" |
| array | JSON array | ["item1", "item2"] |
| object | JSON object | { "key": "value" } |

---

## Client Auth Pages (User Panel/WebView)

These are the web routes under `src/app/client-auth` used by the user panel and WebView app for authentication flows:

| Route | Purpose | Method | Description |
|---|---|---|---|
| `/client-auth` | Entry point | GET | Redirects to signin |
| `/client-auth/signin` | Client login | GET, POST | Login with email/password |
| `/client-auth/signup` | Client registration | GET, POST | Register new client account |
| `/client-auth/forget-password` | Forgot password | GET, POST | Request password reset link |
| `/client-auth/reset-password` | Reset password | GET, POST | Reset password with token |
| `/client-auth/error` | Auth error page | GET | Display authentication errors |
| `/client-auth/onboarding` | Onboarding flow | GET, POST | Post-signup health information |

## Android WebView APK APIs (User Side)

The Android WebView app loads the user panel at:

- **App URL:** `https://dtps.tech/user`
- **API Base:** `<base-url>/api`

### Quick Reference - Most Used Endpoints

| Endpoint | Method | Query Params | Body Fields | Purpose |
|---|---|---|---|---|
| `/api/client/profile` | GET | — | — | Get user profile |
| `/api/client/profile` | PUT | — | firstName, lastName, phone, height, weight | Update profile |
| `/api/client/meal-plan` | GET | date, period | — | Get daily/weekly meals |
| `/api/client/meal-plan/complete` | POST | — | mealId, status, photoUrl | Mark meal complete |
| `/api/client/steps` | GET | date, period | — | Get step count |
| `/api/client/steps` | POST | — | steps, date | Log steps |
| `/api/client/sleep` | GET | date, period | — | Get sleep data |
| `/api/client/sleep` | POST | — | hours, minutes, quality, date | Log sleep |
| `/api/client/hydration` | GET | date | — | Get water intake |
| `/api/client/hydration` | POST | — | glasses, time, type, date | Log water |
| `/api/client/activity` | GET | date, period | — | Get activities |
| `/api/client/activity` | POST | — | name, duration, intensity, date | Log activity |
| `/api/client/messages` | GET | conversationId, limit, offset | — | Get messages |
| `/api/client/messages` | POST | — | conversationId, receiverId, content | Send message |
| `/api/client/notifications` | GET | limit, read | — | Get notifications |
| `/api/client/appointments` | GET | status | — | Get appointments |
| `/api/client/appointments` | POST | — | dietitianId, scheduledDate, duration, type | Book appointment |
| `/api/client/subscriptions` | GET | — | — | Get subscription info |
| `/api/fcm/token` | POST | — | token, platform | Register FCM token |
| `/api/upload` | POST | — | file (multipart), type, folder | Upload file |


## Client (User Panel) APIs

| Endpoint | Methods | Path Params | Body Fields | Notes |
|---|---|---|---|---|
| `/api/client/activity` | GET, POST, PATCH, DELETE | — | name, duration, intensity = 'moderate', sets = 0, reps = 0, date, action, entryId | — |
| `/api/client/appointments` | GET, POST | — | JSON body (see route) | — |
| `/api/client/billing` | GET | — | — | — |
| `/api/client/blogs` | GET | — | — | — |
| `/api/client/blogs/{id}` | GET, POST | id | action | — |
| `/api/client/bmi` | GET, PUT | — | JSON body (see route) | — |
| `/api/client/dietary-recall` | GET, POST, PUT | — | JSON body (see route) | — |
| `/api/client/hydration` | GET, POST, DELETE, PATCH | — | JSON body (see route) | — |
| `/api/client/lifestyle-info` | GET, POST, PUT | — | JSON body (see route) | — |
| `/api/client/meal-plan` | GET | — | — | — |
| `/api/client/meal-plan/complete` | POST | — | JSON body (see route) | — |
| `/api/client/medical-info` | GET, POST, PUT | — | JSON body (see route) | — |
| `/api/client/messages` | GET, POST | — | JSON body (see route) | — |
| `/api/client/messages/conversations` | GET | — | — | — |
| `/api/client/messages/unread-count` | GET | — | — | — |
| `/api/client/notifications` | GET, POST, DELETE | — | JSON body (see route) | — |
| `/api/client/notifications/unread-count` | GET | — | — | — |
| `/api/client/onboarding` | POST, GET | — | JSON body (see route) | — |
| `/api/client/payment-receipt` | GET | — | — | — |
| `/api/client/profile` | GET, PUT | — | JSON body (see route) | — |
| `/api/client/progress` | GET, POST, DELETE | — | JSON body (see route) | — |
| `/api/client/purchase-request` | POST, GET | — | JSON body (see route) | — |
| `/api/client/send-receipt` | POST | — | paymentId | — |
| `/api/client/service-plans` | GET | — | — | — |
| `/api/client/service-plans/purchase` | POST | — | JSON body (see route) | — |
| `/api/client/service-plans/verify` | POST | — | JSON body (see route) | — |
| `/api/client/service-plans/verify-link` | POST | — | JSON body (see route) | — |
| `/api/client/settings` | GET, PUT | — | JSON body (see route) | — |
| `/api/client/sleep` | GET, POST, PATCH, DELETE | — | hours, minutes = 0, quality = 'Good', date, action | — |
| `/api/client/steps` | GET, POST, PATCH, DELETE | — | steps, date, action | — |
| `/api/client/subscriptions` | GET | — | — | — |
| `/api/client/subscriptions/purchase` | POST | — | JSON body (see route) | — |
| `/api/client/subscriptions/verify` | POST | — | JSON body (see route) | — |
| `/api/client/tasks` | GET, PATCH | — | JSON body (see route) | — |
| `/api/client/transformations` | GET | — | — | — |
| `/api/client/unread-counts/refresh` | POST | — | — | — |
| `/api/client/unread-counts/stream` | GET | — | — | — |

## Realtime & Messaging APIs

| Endpoint | Methods | Path Params | Body Fields | Notes |
|---|---|---|---|---|
| `/api/realtime/send` | POST | — | userId, event, data | — |
| `/api/realtime/sse` | GET | — | — | — |
| `/api/realtime/status` | GET, POST | — | JSON body (see route) | — |
| `/api/realtime/typing` | POST | — | receiverId, isTyping | — |

## WebRTC Signaling APIs

| Endpoint | Methods | Path Params | Body Fields | Notes |
|---|---|---|---|---|
| `/api/webrtc/signal` | POST, GET | — | JSON body (see route) | — |
| `/api/webrtc/simple-signal` | POST, GET | — | JSON body (see route) | — |

## FCM (Push Notification) APIs

| Endpoint | Methods | Path Params | Body Fields | Notes |
|---|---|---|---|---|
| `/api/fcm/send` | POST, GET | — | JSON body (see route) | — |
| `/api/fcm/token` | POST, DELETE | — | JSON body (see route) | — |

## Upload APIs

| Endpoint | Methods | Path Params | Body Fields | Notes |
|---|---|---|---|---|
| `/api/upload` | POST, DELETE | — | — | — |

## Health/Status APIs

| Endpoint | Methods | Path Params | Body Fields | Notes |
|---|---|---|---|---|
| `/api/health` | GET | — | — | — |

## Notes

- Path parameters use braces (e.g. `{id}`).
- "Body Fields" are inferred from destructured JSON in route handlers. If listed as "JSON body (see route)", the handler expects a JSON payload but does not destructure fields inline.
- For admin/staff APIs, see `DOCUMENTATION.md` which contains a broader endpoint list.
