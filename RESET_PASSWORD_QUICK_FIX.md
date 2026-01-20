# Quick Fix Checklist: Reset Password IP Address Issue

## ✅ What Was Done

- [x] Changed `.env.local` from `NEXTAUTH_URL=http://localhost:3000` to `NEXTAUTH_URL=https://dtps.tech`
- [x] Updated API routes to use `getBaseUrl()` function for consistency
- [x] Verified configuration matches across all environments

## 📋 Next Steps (You Need to Do This)

### Step 1: Restart Your Application
```bash
# Stop current containers
docker-compose -f docker-compose.prod.yml down

# Start with new environment
docker-compose -f docker-compose.prod.yml up -d
```

### Step 2: Verify the Fix
```bash
# Check logs for success
docker logs dtps-app | grep -i nextauth

# Or manually test
docker exec dtps-app printenv | grep NEXTAUTH_URL
# Should show: NEXTAUTH_URL=https://dtps.tech
```

### Step 3: Test Password Reset
1. Go to login page
2. Click "Forgot Password"
3. Enter your email
4. Check email for reset link
5. **Verify the link shows:** `https://dtps.tech/client-auth/reset-password?token=...`
6. ✅ If it shows domain, the fix worked!

## 🔍 What Was Changed

| File | Change |
|------|--------|
| `.env.local` | `localhost:3000` → `https://dtps.tech` |
| `/src/app/api/user/forget-password/route.ts` | Added import and use of `getBaseUrl()` |
| `/src/app/api/auth/forgot-password/route.ts` | Added import and use of `getBaseUrl()` |

## ❓ Why This Happened

**The Issue:**
- `.env.local` was set to `http://localhost:3000`
- When running in Docker on a network, `localhost` resolves to your machine's local IP
- Your machine's IP is `10.242.42.127`
- So the URL became `http://10.242.42.127:3000`

**The Fix:**
- Now uses your actual domain `https://dtps.tech`
- Works from anywhere, not just local network
- Email providers trust the domain

## 📞 If You Need Help

1. **Links still show IP?**
   - Clear cache: `Ctrl+Shift+Delete`
   - Restart container and try again

2. **Container won't start?**
   - Check logs: `docker logs dtps-app`
   - Verify `.env.local` file exists and is readable

3. **Email not arriving?**
   - Check SMTP settings in `.env.local`
   - Verify reset link is being generated in logs

## 📚 More Information

See detailed explanation in: `WHY_IP_ADDRESS_IN_RESET_PASSWORD.md`
