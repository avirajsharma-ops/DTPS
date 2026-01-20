# 🎯 Quick Reference Card: Reset Password Fix

## Problem
```
❌ Reset password email showed: http://10.242.42.127:3000/...
✅ Should show: https://dtps.tech/...
```

## Why
- `.env.local` was set to `localhost:3000`
- Docker/network environment resolves `localhost` to your machine's IP
- IP-based links don't work outside local network

## Solution
Changed `.env.local`:
```bash
NEXTAUTH_URL=https://dtps.tech  # ← Was: http://localhost:3000
```

## Deploy Now
```bash
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

## Verify
1. Stop here and restart the app (command above)
2. Click "Forgot Password" in your app
3. Check email for reset link
4. Link should show: `https://dtps.tech/client-auth/reset-password?token=...`

## If Still Not Working
```bash
# Check if env loaded
docker logs dtps-app | grep NEXTAUTH_URL

# Force rebuild
docker system prune -f
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

## Files Changed
- ✅ `.env.local` - Updated NEXTAUTH_URL
- ✅ `/src/app/api/user/forget-password/route.ts` - Uses getBaseUrl()
- ✅ `/src/app/api/auth/forgot-password/route.ts` - Uses getBaseUrl()

## Documentation
- See: `COMPLETE_FIX_SUMMARY.md` - Full details
- See: `VISUAL_EXPLANATION_IP_ISSUE.md` - Diagrams
- See: `WHY_IP_ADDRESS_IN_RESET_PASSWORD.md` - Root cause

---

**Status:** ✅ READY TO DEPLOY
