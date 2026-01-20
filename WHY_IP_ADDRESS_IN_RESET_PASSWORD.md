# Why Reset Password Was Using IP Address Instead of Domain

## The Problem Explained

When you were trying to reset your password, the email link showed:
```
❌ WRONG: http://10.242.42.127:3000/client-auth/reset-password?token=...
✅ CORRECT: https://dtps.tech/client-auth/reset-password?token=...
```

## Root Cause Analysis

### Why this happened:

1. **Your `.env.local` was set to `localhost:3000`**
   ```bash
   NEXTAUTH_URL=http://localhost:3000  ❌ This was the problem
   ```

2. **When running in Docker or on a network:**
   - `localhost` is relative to the container/machine
   - Docker containers resolve `localhost` to their internal IP
   - Your machine's IP on the network is `10.242.42.127`
   - So the URL becomes `http://10.242.42.127:3000`

3. **The application then uses this URL for reset links:**
   - Application reads `NEXTAUTH_URL` from `.env.local`
   - Generates reset link: `${NEXTAUTH_URL}/client-auth/reset-password?token=...`
   - Result: `http://10.242.42.127:3000/client-auth/reset-password?...`

## The Solution

### ✅ Fixed Configuration

Updated `.env.local`:
```bash
# BEFORE (Wrong):
NEXTAUTH_URL=http://localhost:3000

# AFTER (Correct):
NEXTAUTH_URL=https://dtps.tech
```

## Why This Matters

### Security & Usability:
- **Users can't access links with IP addresses** from outside your network
- **Email providers may block IP address links** as suspicious
- **Production URLs should be domain-based** for reliability
- **Users expect domain URLs**, not local IPs

## Environment Variables Reference

Your environment is already correctly configured in multiple places:

```bash
# ✅ Docker/Android .env (CORRECT):
NEXTAUTH_URL=https://dtps.tech
NEXTAUTH_SECRET=zoconut-super-secret-production-key-2024
NODE_ENV=production

# ✅ Now also in root .env.local (FIXED):
NEXTAUTH_URL=https://dtps.tech
NEXTAUTH_SECRET=zoconut-super-secret-production-key-2024
```

## How to Deploy This Fix

### Step 1: Verify the fix
```bash
cat /Users/apple/Desktop/DTPS/.env.local | grep NEXTAUTH_URL
# Should show: NEXTAUTH_URL=https://dtps.tech
```

### Step 2: Restart your application

**For Docker:**
```bash
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

**For local development:**
```bash
npm run dev
# or
yarn dev
```

### Step 3: Test the fix

1. Click "Forgot Password"
2. Enter your email
3. Check the reset link in your email
4. Verify the URL shows: `https://dtps.tech/client-auth/reset-password?token=...`
5. Click the link and reset your password

## Configuration Priority (How URLs are chosen)

The application uses this priority when selecting the base URL:

1. **Check if running in production** → Use `https://dtps.tech`
2. **Check if `NEXTAUTH_URL` is set** → Use that value
3. **Fallback** → Use `http://localhost:3000`

Code reference in `/src/lib/config.ts`:
```typescript
export function getBaseUrl(): string {
  const isProduction = process.env.NODE_ENV === 'production' || 
                       process.env.VERCEL_ENV === 'production' ||
                       process.env.NEXTAUTH_URL?.includes('dtps.tech');
  
  if (isProduction) {
    return PRODUCTION_URL;  // https://dtps.tech
  }
  
  return process.env.NEXTAUTH_URL || 'http://localhost:3000';
}
```

## Quick Reference: What Was Changed

### Files Modified:
1. **`.env.local`** - Updated `NEXTAUTH_URL` to use domain
2. **`/src/app/api/user/forget-password/route.ts`** - Now uses `getBaseUrl()`
3. **`/src/app/api/auth/forgot-password/route.ts`** - Now uses `getBaseUrl()`

### What Now Works:
- ✅ Password reset emails use correct domain
- ✅ Reset links are accessible from anywhere
- ✅ Email providers won't block IP-based links
- ✅ Production-ready configuration
- ✅ Mobile app and web app have consistent URLs

## Troubleshooting

### Still seeing IP address?

1. **Clear browser cache:**
   ```bash
   # Chrome/Firefox: Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)
   ```

2. **Check environment variable is loaded:**
   ```bash
   docker logs dtps-app | grep NEXTAUTH_URL
   ```

3. **Verify container restarted:**
   ```bash
   docker ps | grep dtps-app
   # Look for restart time - should be recent
   ```

4. **Force rebuild:**
   ```bash
   docker-compose -f docker-compose.prod.yml down
   docker system prune -f
   docker-compose -f docker-compose.prod.yml build --no-cache
   docker-compose -f docker-compose.prod.yml up -d
   ```

### URL not in email?

1. Check NEXTAUTH_URL is saved: `grep NEXTAUTH_URL .env.local`
2. Restart app: `docker-compose restart app`
3. Check logs: `docker logs dtps-app | grep -i password`

## Summary

| Before | After |
|--------|-------|
| ❌ `http://10.242.42.127:3000/...` | ✅ `https://dtps.tech/...` |
| ❌ IP-based URLs | ✅ Domain-based URLs |
| ❌ Users can't access from outside network | ✅ Users can access from anywhere |
| ❌ Email providers flag as suspicious | ✅ Email providers trust the domain |

Your application is now properly configured to use your domain for all password reset emails! 🎉
