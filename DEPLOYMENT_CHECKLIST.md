# 📋 Deployment Checklist: Reset Password Fix

## Pre-Deployment

- [x] `.env.local` updated with `NEXTAUTH_URL=https://dtps.tech`
- [x] API routes updated to use `getBaseUrl()` function
- [x] No syntax errors in any files
- [x] Docker configuration correctly loads environment
- [x] Documentation created and reviewed

## Deployment Steps

### Step 1: Backup (Optional but Recommended)
```bash
# Create backup of current env (if you have production running)
cp /Users/apple/Desktop/DTPS/.env.local /Users/apple/Desktop/DTPS/.env.local.backup
```
- [ ] Backup created (optional)

### Step 2: Stop Current Application
```bash
docker-compose -f docker-compose.prod.yml down
```
- [ ] Wait for containers to stop
- [ ] Verify: `docker ps` shows no dtps containers

### Step 3: Restart with New Configuration
```bash
docker-compose -f docker-compose.prod.yml up -d
```
- [ ] Command executed
- [ ] Wait 30 seconds for startup

### Step 4: Verify Deployment

#### 4a. Check Container Status
```bash
docker ps | grep dtps-app
```
- [ ] dtps-app container is running
- [ ] Status shows "Up" (not "Exited")

#### 4b. Verify Environment Variable
```bash
docker exec dtps-app printenv | grep NEXTAUTH_URL
```
- [ ] Output shows: `NEXTAUTH_URL=https://dtps.tech`

#### 4c. Check Application Logs
```bash
docker logs dtps-app | head -50
```
- [ ] No error messages
- [ ] Application started successfully
- [ ] Database connection established

### Step 5: Test Password Reset (Manual Testing)

#### Test A: Web Platform
1. [ ] Open application in browser
2. [ ] Navigate to login page
3. [ ] Click "Forgot Password" button
4. [ ] Enter a test email address
5. [ ] Click "Send Reset Link"
6. [ ] Wait for confirmation message
7. [ ] Check email inbox for reset email
8. [ ] **Verify link contains:** `https://dtps.tech/` (not IP)
9. [ ] Click the link in email
10. [ ] Verify you can set new password
11. [ ] Test new password by logging in

#### Test B: Mobile Platform (If Available)
1. [ ] Open app on mobile device
2. [ ] Go to login screen
3. [ ] Tap "Forgot Password"
4. [ ] Enter test email
5. [ ] Check email on mobile
6. [ ] **Verify link works on mobile network**
7. [ ] Test password reset on mobile

#### Test C: Different Email Providers
- [ ] Test with Gmail account
- [ ] Test with Outlook account (if available)
- [ ] Verify emails arrive in inbox (not spam)
- [ ] Verify links are clickable

### Step 6: Monitor for Issues (First 24 Hours)

#### Real-time Monitoring
```bash
# Watch logs for errors
docker logs -f dtps-app | grep -i "password\|reset\|error"
```
- [ ] Set up log monitoring
- [ ] Watch for any errors
- [ ] Monitor for 24 hours after deployment

#### Check Email Delivery
- [ ] Monitor email server logs (if accessible)
- [ ] Check for failed deliveries
- [ ] Verify emails are not being marked as spam

---

## Rollback Plan (If Issues Occur)

### If Problem: Reset Links Still Show IP Address

**Step 1:** Verify environment file
```bash
cat /Users/apple/Desktop/DTPS/.env.local | grep NEXTAUTH_URL
```
- [ ] If shows `localhost:3000`, restart container:
  ```bash
  docker-compose -f docker-compose.prod.yml restart app
  ```

**Step 2:** Force clean rebuild
```bash
docker-compose -f docker-compose.prod.yml down
docker system prune -f
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```
- [ ] Wait 60 seconds for startup
- [ ] Test again

**Step 3:** If still not working, rollback
```bash
# If you have backup
cp /Users/apple/Desktop/DTPS/.env.local.backup /Users/apple/Desktop/DTPS/.env.local

docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```
- [ ] Rolled back to previous version
- [ ] Retest functionality

### If Problem: Application Won't Start

**Step 1:** Check logs
```bash
docker logs dtps-app | tail -100
```
- [ ] Look for error messages
- [ ] Search for "ENOTFOUND" or "connection refused"

**Step 2:** Verify Docker resources
```bash
docker system df
```
- [ ] Check available disk space
- [ ] Should have at least 2GB free

**Step 3:** Clean and rebuild
```bash
docker-compose -f docker-compose.prod.yml down
docker system prune -a --volumes
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

### If Problem: Emails Not Arriving

**Step 1:** Check SMTP configuration in `.env.local`
```bash
grep SMTP /Users/apple/Desktop/DTPS/.env.local
```
- [ ] SMTP_HOST is correct
- [ ] SMTP_USER is correct
- [ ] SMTP_PASS is correct

**Step 2:** Verify email service
```bash
docker logs dtps-app | grep -i "smtp\|mail\|email"
```
- [ ] Look for SMTP connection errors
- [ ] Check for authentication failures

**Step 3:** Test email manually
- [ ] Use SMTP test tool
- [ ] Verify SMTP credentials work
- [ ] Check firewall/security groups

---

## Post-Deployment Verification

### Within 1 Hour
- [ ] Test password reset (web)
- [ ] Test password reset (mobile)
- [ ] Verify email delivery
- [ ] Confirm links use domain (not IP)
- [ ] No errors in application logs

### Within 24 Hours
- [ ] Have multiple users test
- [ ] Check email delivery rate
- [ ] Monitor application performance
- [ ] No new issues reported
- [ ] Email server logs clean

### Weekly
- [ ] Monitor password reset usage
- [ ] Check for spam complaints
- [ ] Review any error logs
- [ ] Verify email deliverability

---

## Success Criteria ✅

Your deployment is successful when:

1. **Reset email link format**
   ```
   ✅ https://dtps.tech/client-auth/reset-password?token=xyz
   ❌ NOT http://10.242.42.127:3000/...
   ```

2. **Email delivery**
   ```
   ✅ Emails arrive in inbox (not spam)
   ❌ NOT blocked by provider
   ```

3. **Link functionality**
   ```
   ✅ Link is clickable
   ✅ Opens reset password page
   ✅ Can set new password
   ❌ NOT showing 404 or timeout
   ```

4. **User experience**
   ```
   ✅ Works from any network
   ✅ Works on mobile
   ✅ Works on desktop
   ✅ Works on public WiFi
   ❌ NOT limited to local network
   ```

---

## Communication

### Notify Team
- [ ] Inform team of deployment
- [ ] Share testing results
- [ ] Provide documentation links
- [ ] Request feedback

### Document Results
- [ ] Record deployment date: _________________
- [ ] Record deployment time: _________________
- [ ] List any issues encountered: _________________
- [ ] Note successful completion: _________________

---

## Sign-Off

**Deployment Completed By:** _________________
**Date:** _________________
**Time:** _________________
**Status:** [ ] SUCCESS   [ ] PARTIAL   [ ] FAILED

**Notes:**
```
________________________________________________________________________

________________________________________________________________________

________________________________________________________________________
```

---

## Quick Links to Documentation

- `FINAL_SUMMARY_RESET_PASSWORD_FIX.md` - Complete technical summary
- `QUICK_REFERENCE_CARD.md` - One-page reference
- `VISUAL_EXPLANATION_IP_ISSUE.md` - Diagrams and visuals
- `COMPLETE_FIX_SUMMARY.md` - Comprehensive guide
- `WHY_IP_ADDRESS_IN_RESET_PASSWORD.md` - Root cause analysis

---

**Print this checklist and check off items as you complete them!**
