# Razorpay Webhook Setup Guide

## What's Done

Created webhook handler at: `src/app/api/webhooks/razorpay/route.ts`

This webhook automatically detects when:
- ✅ Payment is successful
- ✅ Payment fails
- ✅ Payment link is completed
- ✅ Payment link is cancelled

---

## Step 1: Get Webhook Secret

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Navigate to **Settings → Webhooks**
3. Click **Add New Webhook**
4. Fill in:
   - **Webhook URL**: `https://yourdomain.com/api/webhooks/razorpay`
   - **Events**: Select these events:
     - `payment.authorized`
     - `payment.captured`
     - `payment.failed`
     - `payment.link.completed`
     - `payment.link.cancelled`
5. Click **Create**
6. Copy the **Webhook Secret** (shown once)

---

## Step 2: Add Environment Variable

Add to `.env.local`:

```env
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
```

---

## Step 3: Test Webhook (Local Development)

For local testing, use **ngrok** to expose your local server:

```bash
# Install ngrok (if not already installed)
npm install -g ngrok

# Start your app
npm run dev

# In another terminal, expose your local server
ngrok http 3000

# You'll get a URL like: https://abc123.ngrok.io
# Use this in Razorpay webhook: https://abc123.ngrok.io/api/webhooks/razorpay
```

---

## Step 4: How It Works

### Payment Flow:
1. Client clicks payment link
2. Completes payment on Razorpay
3. Razorpay sends webhook to your server
4. Webhook handler verifies signature
5. Updates subscription status to "paid" and "active"
6. Client gets access to services

### Webhook Events Handled:

| Event | Action |
|-------|--------|
| `payment.authorized` | Mark subscription as paid |
| `payment.captured` | Mark subscription as paid |
| `payment.failed` | Mark subscription as failed |
| `payment.link.completed` | Mark subscription as paid |
| `payment.link.cancelled` | Mark subscription as failed |

---

## Step 5: Add Notifications (Optional)

The webhook has TODO comments for:
- Email notifications
- SMS notifications
- Other business logic

Example - Add email notification:

```typescript
// In handlePaymentSuccess function
import { sendEmail } from '@/lib/email'; // Your email service

await sendEmail({
  to: subscription.client.email,
  subject: 'Payment Successful',
  template: 'payment-success',
  data: { subscription }
});
```

---

## Step 6: Verify in Dashboard

1. Go to Razorpay Dashboard
2. Navigate to **Settings → Webhooks**
3. Click your webhook
4. Check **Recent Deliveries** to see webhook calls
5. Green checkmark = successful
6. Red X = failed

---

## Testing Checklist

- [ ] Added `RAZORPAY_WEBHOOK_SECRET` to `.env.local`
- [ ] Webhook URL configured in Razorpay dashboard
- [ ] Selected all required events
- [ ] Tested with ngrok (local)
- [ ] Checked webhook delivery logs
- [ ] Verified subscription status updates

---

## Troubleshooting

### Webhook not being called?
- Check webhook URL is correct
- Verify events are selected
- Check firewall/security settings
- Use ngrok for local testing

### Signature verification fails?
- Verify `RAZORPAY_WEBHOOK_SECRET` is correct
- Check webhook secret hasn't changed
- Ensure secret is copied exactly

### Subscription not updating?
- Check MongoDB connection
- Verify subscription exists with correct order ID
- Check browser console for errors
- Check server logs

---

## Production Deployment

1. Deploy your app to production
2. Update webhook URL in Razorpay:
   - From: `https://yourdomain.com/api/webhooks/razorpay`
3. Verify webhook is working with real payments
4. Monitor webhook delivery logs

---

## Security Notes

✅ Webhook signature is verified
✅ Only valid webhooks are processed
✅ Database is updated atomically
✅ Errors are logged for debugging

---

## Next Steps

1. Set up email/SMS notifications
2. Add payment receipt generation
3. Add refund handling
4. Add payment retry logic
5. Add analytics/reporting

---

**Webhook is now ready to detect payment completion!** 🎉

