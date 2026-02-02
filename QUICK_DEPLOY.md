# 🚀 QUICK DEPLOYMENT GUIDE - Domain IP Fix

## One-Command Deployment

```bash
# Stop, rebuild, and restart with new configuration
docker-compose -f docker-compose.prod.yml down && \
docker-compose -f docker-compose.prod.yml build --no-cache && \
docker-compose -f docker-compose.prod.yml up -d && \
sleep 30 && \
docker logs dtps-app | tail -20
```

---

## 5-Minute Deployment Process

### Step 1: Pull Latest Code (30 seconds)
```bash
cd /Users/lokeshdhote/Desktop/DTPS
git pull origin main
```

### Step 2: Stop Current Container (30 seconds)
```bash
docker-compose -f docker-compose.prod.yml down
```

### Step 3: Rebuild with New Configuration (2-3 minutes)
```bash
docker-compose -f docker-compose.prod.yml build --no-cache
```

### Step 4: Start New Container (1 minute)
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Step 5: Verify Everything (1 minute)
```bash
# Wait for startup
sleep 30

# Check container status
docker-compose -f docker-compose.prod.yml ps

# Check environment loaded
docker exec dtps-app printenv | grep NEXTAUTH_URL

# Test application
curl -s https://dtps.tech/health | jq .

# Check logs
docker logs dtps-app | tail -20
```

---

## Verification Tests

```bash
# ✅ Test 1: Environment Correct
docker exec dtps-app printenv | grep NEXTAUTH_URL
# Expected: NEXTAUTH_URL=https://dtps.tech

# ✅ Test 2: App Running
curl -s https://dtps.tech/health | jq .
# Expected: {"status":"ok"}

# ✅ Test 3: No Errors in Logs
docker logs dtps-app | grep -i error
# Expected: (empty - no errors)

# ✅ Test 4: Password Reset (Manual)
# 1. Visit https://dtps.tech/login
# 2. Click "Forgot Password"
# 3. Enter test email
# 4. Check inbox for reset link
# 5. Verify link has https://dtps.tech/... ✅ (not IP)

# ✅ Test 5: Post-Restart
docker-compose -f docker-compose.prod.yml restart app
sleep 30
curl -s https://dtps.tech/health | jq .
# Expected: Website still works ✅
```

---

## Issue: Still Showing IP?

### Quick Fixes

```bash
# Fix 1: Force full rebuild
docker-compose -f docker-compose.prod.yml down
docker system prune -a -f
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Fix 2: Check environment variable
docker exec dtps-app cat .env.local | grep NEXTAUTH_URL

# Fix 3: Verify it's loaded
docker exec dtps-app printenv | grep NEXTAUTH_URL

# Fix 4: Check logs for errors
docker logs dtps-app | grep -i "nextauth\|error"

# Fix 5: Clear browser cache (in browser)
# Ctrl+Shift+Delete → Clear all → Reload page
```

---

## What Changed?

| Item | Before | After |
|------|--------|-------|
| NEXTAUTH_URL | http://localhost:3000 | https://dtps.tech ✅ |
| Reset Email Link | http://10.242.42.127:3000 | https://dtps.tech ✅ |
| getBaseUrl() | Not used | Now used everywhere ✅ |
| .env.production | Missing | Created ✅ |
| Docker binding | 10.242.42.127:3000 | 0.0.0.0:3000 ✅ |

---

## Success Checklist

After deployment:
- [ ] Website loads on https://dtps.tech
- [ ] Browser shows domain, not IP
- [ ] Password reset email has domain URL
- [ ] Reset link works from mobile
- [ ] No errors in logs
- [ ] After restart, still works on domain

---

## Files Changed

1. `src/lib/config.ts` - ✅ Already has getBaseUrl()
2. `src/app/api/user/forget-password/route.ts` - ✅ Uses getBaseUrl()
3. `src/app/api/auth/forgot-password/route.ts` - ✅ Uses getBaseUrl()
4. `.env.local` - ✅ Updated with NEXTAUTH_URL=https://dtps.tech
5. `.env.production` - ✅ NEW created with proper values
6. `docker-compose.prod.yml` - ✅ Already loads .env.local

---

**Status:** ✅ All fixes implemented - Ready to deploy!

Deploy now using the one-command deployment above.
