# Visual Explanation: Why IP Address Was Used

## The Problem Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER REQUESTS PASSWORD RESET              │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────────────┐
                    │ User enters     │
                    │ email address   │
                    └─────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│           API: /api/user/forget-password                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────────────────┐
                    │ Read NEXTAUTH_URL   │
                    │ from .env.local     │
                    └─────────────────────┘
                              ↓
            ┌─────────────────────────────────────┐
            │  ❌ OLD: localhost:3000             │
            │  ✅ NEW: https://dtps.tech          │
            └─────────────────────────────────────┘
                              ↓
                    ┌─────────────────────┐
                    │ Generate reset link │
                    │ with base URL       │
                    └─────────────────────┘
                              ↓
        ┌──────────────────────────────────────┐
        │ ❌ OLD: http://10.242.42.127:3000/...│
        │ ✅ NEW: https://dtps.tech/...        │
        └──────────────────────────────────────┘
                              ↓
              ┌────────────────────────────┐
              │ Send email with reset link │
              └────────────────────────────┘
                              ↓
                  ┌──────────────────────┐
                  │ User receives email  │
                  └──────────────────────┘
                              ↓
        ┌──────────────────────────────────────┐
        │ ❌ OLD: Link unreachable from        │
        │     outside local network            │
        │ ✅ NEW: Link works from anywhere     │
        └──────────────────────────────────────┘
```

## Why localhost:3000 Became 10.242.42.127:3000

```
LOCAL DEVELOPMENT:
┌──────────────────────┐
│  .env.local          │
│  NEXTAUTH_URL=       │
│  http://localhost:3000
└──────────────────────┘
         ↓
    Resolves to: 127.0.0.1:3000 (local machine only)


DOCKER ENVIRONMENT:
┌──────────────────────┐
│  .env.local          │
│  NEXTAUTH_URL=       │
│  http://localhost:3000
└──────────────────────┘
         ↓
    Resolves to: 10.242.42.127:3000 (your machine's IP on network)
         ↓
    ❌ Problem: This IP is not accessible from email clients
                 or outside the local network


PRODUCTION FIX:
┌──────────────────────┐
│  .env.local          │
│  NEXTAUTH_URL=       │
│  https://dtps.tech   │
└──────────────────────┘
         ↓
    Resolves to: Your domain (accessible from anywhere)
         ↓
    ✅ Works! Email clients and external users can access
```

## Email Link Comparison

### Before (Wrong)
```
Email Content:
─────────────────────────────────────
Subject: Reset Your Password - DTPS

Reset Password
Click below to reset your password:

[Reset Password Button]
↓ (hidden link)
http://10.242.42.127:3000/client-auth/reset-password?token=abc123

Problems:
❌ Users can't click from outside network
❌ Email providers might flag as spam
❌ IP address changes if network changes
❌ Not suitable for production
```

### After (Correct)
```
Email Content:
─────────────────────────────────────
Subject: Reset Your Password - DTPS

Reset Password
Click below to reset your password:

[Reset Password Button]
↓ (hidden link)
https://dtps.tech/client-auth/reset-password?token=abc123

Benefits:
✅ Works from anywhere
✅ Email providers trust domain
✅ Stable, doesn't change
✅ Professional, production-ready
```

## Network Diagram

```
BEFORE FIX:
──────────

Your Machine         Docker Container      Email Server
(10.242.42.127)  ←→  (localhost)       ←→  
         │                                   User's Device
         │                                   (Different Network)
         └── Generates Link ─→ http://10.242.42.127:3000
                               │
                               └─→ ❌ UNREACHABLE
                                   (IP not on user's network)


AFTER FIX:
──────────

Your Machine         Docker Container      Email Server
(10.242.42.127)  ←→  (localhost)       ←→  
         │                                   User's Device
         │                                   (Different Network)
         └── Generates Link ─→ https://dtps.tech
                               │
                               └─→ ✅ ACCESSIBLE
                                   (Domain works from anywhere)
```

## Configuration Hierarchy

```
Application Startup
        ↓
    ┌───────────────────────────────┐
    │ Check NODE_ENV                │
    ├─ production? → Use dtps.tech  │
    └───────────────────────────────┘
        ↓ NO
    ┌───────────────────────────────┐
    │ Check NEXTAUTH_URL env var    │
    ├─ includes dtps.tech?          │
    │  → Use PRODUCTION_URL         │
    └───────────────────────────────┘
        ↓ NO
    ┌───────────────────────────────┐
    │ Use NEXTAUTH_URL if set       │
    ├─ https://dtps.tech ✅         │
    │ http://localhost:3000 ✅      │
    │ http://10.0.0.1:3000 ❌       │
    └───────────────────────────────┘
        ↓ NO
    ┌───────────────────────────────┐
    │ Fallback                      │
    ├─ http://localhost:3000        │
    └───────────────────────────────┘
```

## File Changes Summary

```
┌────────────────────────────────────────────────────┐
│         FILES CHANGED TO FIX THE ISSUE             │
└────────────────────────────────────────────────────┘

1. .env.local
   ┌────────────────────────────────────────────┐
   │ - NEXTAUTH_URL=http://localhost:3000       │
   │ + NEXTAUTH_URL=https://dtps.tech           │
   └────────────────────────────────────────────┘

2. src/app/api/user/forget-password/route.ts
   ┌────────────────────────────────────────────┐
   │ + import { getBaseUrl } from '@/lib/config'│
   │ - const baseUrl = process.env.NEXTAUTH_URL │
   │ + const baseUrl = getBaseUrl()              │
   └────────────────────────────────────────────┘

3. src/app/api/auth/forgot-password/route.ts
   ┌────────────────────────────────────────────┐
   │ + import { getBaseUrl } from '@/lib/config'│
   │ - const baseUrl = process.env.NEXTAUTH_URL │
   │ + const baseUrl = getBaseUrl()              │
   └────────────────────────────────────────────┘
```

## Testing Scenarios

```
LOCAL MACHINE (http://10.242.42.127:3000)
┌──────────────────────────────────────────┐
│ User from same network:                  │
│   ✓ Can access reset link                │
│ User from outside network:               │
│   ✗ Cannot access reset link             │
│ Email providers:                         │
│   ? May flag as suspicious               │
└──────────────────────────────────────────┘

PRODUCTION DOMAIN (https://dtps.tech)
┌──────────────────────────────────────────┐
│ User from same network:                  │
│   ✓ Can access reset link                │
│ User from outside network:               │
│   ✓ Can access reset link                │
│ Email providers:                         │
│   ✓ Trust domain, deliver reliably       │
└──────────────────────────────────────────┘
```

## Quick Reference

| Aspect | Before | After |
|--------|--------|-------|
| URL Format | `http://10.242.42.127:3000` | `https://dtps.tech` |
| Accessibility | Local network only | Global/Anywhere |
| Security | ⚠️ Suspicious | ✅ Trusted |
| Email Delivery | ⚠️ May block | ✅ Reliable |
| Production Ready | ❌ No | ✅ Yes |
| Mobile Support | ⚠️ Limited | ✅ Full |
| SSL/TLS | ❌ No | ✅ Yes |

---

This visual explanation shows why the IP address was being used and how the domain-based approach solves all the problems!
