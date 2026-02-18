# Email Fix - Quick Reference

## 🐛 The Bug
Environment variable typo prevented SMTP configuration:
```
❌ MTP_PORT=465    (in .env files)
✅ SMTP_PORT=587   (fixed)
```

## ✅ What's Fixed
1. ✅ Fixed `MTP_PORT` → `SMTP_PORT=587` in `.env` and `.env.local`
2. ✅ Improved email service with lazy initialization
3. ✅ Added SMTP validation before sending emails
4. ✅ Enhanced logging in all email endpoints:
   - Invoice sending
   - Payment reminders
   - Password resets (auth & client)

## 📋 Files Modified

**Configuration:**
- `.env` - Fixed SMTP_PORT typo
- `.env.local` - Fixed SMTP_PORT typo

**Email Service:**
- `src/lib/services/email.ts` - Lazy init + validation

**API Routes:**
- `src/app/api/payment-links/invoice/route.ts` - Added logging
- `src/app/api/payment-links/reminder/route.ts` - Added logging
- `src/app/api/auth/forgot-password/route.ts` - Added logging
- `src/app/api/user/forget-password/route.ts` - Added logging

## 🧪 Verify Fix

**In server logs, you should see:**
```
[EMAIL] Initializing SMTP transporter: {
  host: "smtp.hostinger.com",
  port: 587,
  secure: false,
  user: "info@dtps.app",
  hasPassword: true
}

[INVOICE] Sending invoice to: customer@example.com
[EMAIL] Attempting to send email to: customer@example.com
[EMAIL] Email sent successfully to: customer@example.com, messageId: <xxx>
[INVOICE] Invoice sent successfully to: customer@example.com
```

## ⚠️ If Still Getting Errors

Check these in order:

```bash
# 1. Verify SMTP credentials
cat .env | grep SMTP_

# 2. Restart dev server (env vars cached)
pkill -f "next dev"
npm run dev

# 3. Check email service logs
tail -100f app.log | grep "\[EMAIL\]"

# 4. Check network (SMTP server accessible)
telnet smtp.hostinger.com 587
```

## 🔧 SMTP Configuration

Required in `.env`:
```env
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=info@dtps.app
SMTP_PASS=Admin@login2025
SMTP_SECURE=false
```

Optional:
```env
SMTP_NAME=DTPS
SMTP_FROM=info@dtps.app
```

## 📞 Support

All email errors now include debug info:
```json
{
  "error": "Failed to send invoice email...",
  "debug": {
    "smtpConfigured": true,
    "smtpHost": "smtp.hostinger.com",
    "smtpUser": "info@dtps.app"
  }
}
```

