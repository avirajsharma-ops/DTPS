# 🚀 QUICK DEPLOYMENT GUIDE - Domain-to-IP Fix

**Status:** ✅ All code fixes completed  
**Ready to Deploy:** YES  
**Est. Time:** 15-20 minutes  

---

## 📋 Pre-Deployment Checklist

- [x] ✅ Environment file (.env.local) configured: `NEXTAUTH_URL=https://dtps.tech`
- [x] ✅ Code files updated to use `getBaseUrl()`
- [x] ✅ Docker configuration verified
- [x] ✅ All tests written and ready

---

## 🔧 Option 1: Automated Deployment (Recommended)

### Step 1: Run the Deployment Script
```bash
cd /Users/lokeshdhote/Desktop/DTPS
chmod +x DEPLOYMENT_AND_VERIFICATION.sh
./DEPLOYMENT_AND_VERIFICATION.sh
```

**What This Does:**
- ✅ Verifies environment configuration
- ✅ Checks code files are correctly updated
- ✅ Backs up current .env.local
- ✅ Stops old containers
- ✅ Builds new Docker images
- ✅ Starts new containers
- ✅ Runs health checks
- ✅ Verifies no private IPs in logs
- ✅ Generates deployment report

---

## 🔧 Option 2: Manual Deployment (Step-by-Step)

### Step 1: Verify Configuration
```bash
cd /Users/lokeshdhote/Desktop/DTPS

# Check .env.local
grep NEXTAUTH_URL .env.local
# Expected: NEXTAUTH_URL=https://dtps.tech

# Verify NODE_ENV
grep NODE_ENV .env.local
# Expected: NODE_ENV=production
```

### Step 2: Backup Current State
```bash
# Backup environment file
cp .env.local .env.local.backup.$(date +%s)

# Backup Docker volumes (optional)
docker-compose -f docker-compose.prod.yml down
```

### Step 3: Build and Deploy
```bash
# Build new images without cache
docker-compose -f docker-compose.prod.yml build --no-cache

# Start containers
docker-compose -f docker-compose.prod.yml up -d

# Wait for startup
sleep 10

# Check status
docker-compose -f docker-compose.prod.yml ps
```

### Step 4: Verify Deployment
```bash
# Check environment variables in container
docker exec dtps-app printenv | grep NEXTAUTH_URL
# Output: NEXTAUTH_URL=https://dtps.tech

# Check health endpoint
curl -s http://localhost:3000/api/health | jq .

# Check logs for errors
docker logs dtps-app | tail -50

# Check for private IP references
docker logs dtps-app | grep -E "10\.|192\.168\.|172\.16\." || echo "✓ No private IPs found"
```

---

## ✅ Post-Deployment Verification

### 1. Website Loads Correctly
```bash
# Test locally
curl -s https://dtps.tech/api/health | jq .
# Expected: {"status":"ok"} or similar success response
```

### 2. Test Password Reset Flow
```
1. Go to https://dtps.tech/login
2. Click "Forgot Password"
3. Enter test email
4. Check email for reset link
5. Verify link contains: https://dtps.tech/... (NOT http://10.x.x.x:3000)
6. Click link and verify reset form loads
```

### 3. Check Application Logs
```bash
docker logs dtps-app --tail 100

# Should see:
# ✓ Connected to MongoDB
# ✓ Next.js app listening on port 3000
# ✗ Should NOT see: http://10.x.x.x or localhost:3000 in links
```

### 4. Monitor for 1 Hour
```bash
# Watch logs in real-time
docker logs dtps-app --follow

# In another terminal, check periodic health
watch -n 30 'curl -s https://dtps.tech/api/health'
```

---

## 🐛 Troubleshooting

### Issue: Still seeing private IP in logs
```bash
# Solution:
docker-compose -f docker-compose.prod.yml down
sleep 2

# Update .env.local if needed
echo "NEXTAUTH_URL=https://dtps.tech" >> .env.local

# Rebuild without cache
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

### Issue: Health check failing
```bash
# Check container is running
docker-compose -f docker-compose.prod.yml ps

# View startup logs
docker logs dtps-app | head -50

# Check port binding
netstat -tulpn | grep 3000 || ss -tulpn | grep 3000
```

### Issue: Domain not resolving
```bash
# Check Nginx is running
docker-compose -f docker-compose.prod.yml ps | grep nginx

# Check Nginx configuration
docker exec dtps-nginx nginx -t

# View Nginx logs
docker logs dtps-nginx | tail -30
```

### Issue: OAuth callbacks failing
```bash
# Verify getBaseUrl() is being used
grep -r "getBaseUrl" src/app/api/auth/ | head -20

# Check redirect URI matches Google Console
# Should be: https://dtps.tech/api/auth/google-calendar/callback
```

---

## 🔄 Rollback Plan (If Something Goes Wrong)

```bash
cd /Users/lokeshdhote/Desktop/DTPS

# Stop current containers
docker-compose -f docker-compose.prod.yml down

# Restore backup .env.local
cp .env.local.backup.LATEST .env.local

# Rebuild with previous version
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📊 Configuration Summary

| Component | Value | Status |
|-----------|-------|--------|
| **NEXTAUTH_URL** | https://dtps.tech | ✅ Correct |
| **NODE_ENV** | production | ✅ Correct |
| **PORT** | 3000 | ✅ Correct |
| **HOSTNAME** | 0.0.0.0 | ✅ Correct |
| **Docker Binding** | 3000:3000 | ✅ Correct |
| **Nginx SSL** | Enabled | ✅ Correct |
| **getBaseUrl() Usage** | All files | ✅ Updated |
| **Private IP Refs** | None | ✅ Removed |

---

## 🎯 Success Criteria

**Deployment is successful when:**
- ✅ Website loads at https://dtps.tech
- ✅ No errors in application logs
- ✅ Health endpoint returns 200
- ✅ Password reset emails contain domain (not IP)
- ✅ OAuth callbacks work (Google Calendar, etc.)
- ✅ No 10.x.x.x IP addresses in logs
- ✅ No HTTP mixed content warnings
- ✅ Website works after server restart

---

## 📞 Support

If deployment fails:

1. **Check logs:** `docker logs dtps-app | tail -100`
2. **Review deployment report:** Check deployment.log
3. **Rollback:** Use rollback steps above
4. **Contact:** Provide deployment.log and exact error message

---

**Last Updated:** 2026-02-02  
**Fixed Files:** 7 API route files  
**Configuration Changes:** 1 (already in .env.local)  
**Breaking Changes:** None - backward compatible
