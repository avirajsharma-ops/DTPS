# Installation Guide - Dietician Client Management System

## Prerequisites
- Node.js 18+ installed
- MongoDB database
- Razorpay account (for payment integration)

---

## Step 1: Install Dependencies

Run the following command to install Razorpay SDK:

```bash
npm install razorpay
```

Or if using yarn:

```bash
yarn add razorpay
```

---

## Step 2: Configure Environment Variables

Add the following to your `.env.local` file:

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here

# Make sure these exist
NEXTAUTH_URL=http://localhost:3000
MONGODB_URI=your_mongodb_connection_string
```

### Getting Razorpay Credentials

1. Sign up at [https://razorpay.com](https://razorpay.com)
2. Go to Settings → API Keys
3. Generate Test/Live keys
4. Copy Key ID and Key Secret to `.env.local`

---

## Step 3: Database Setup

The system will automatically create the necessary collections when you first use the features. No manual database setup required.

### Collections Created:
- `subscriptionplans` - Subscription plan templates
- `clientsubscriptions` - Client subscription records
- `mealplans` - Diet plans (existing)
- `users` - User accounts (existing)

---

## Step 4: Create Admin User

If you don't have an admin user yet:

1. Register a new user
2. Manually update the user role in MongoDB:

```javascript
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
)
```

---

## Step 5: Initial Setup

### 1. Create Subscription Plans (Admin)

1. Login as admin
2. Navigate to `/admin/subscription-plans`
3. Click "Create Plan"
4. Create your first plan:
   - **Name:** "Weight Loss - 1 Month"
   - **Category:** Weight Loss
   - **Price:** 2999
   - **Duration:** 1 month
   - **Consultations:** 4
   - **Follow-ups:** 2
   - **Diet Plan:** Yes
   - **Chat Support:** Yes

### 2. Assign Clients to Dieticians (Admin)

1. Navigate to `/admin/clients`
2. Find a client
3. Click "Assign" button
4. Select a dietician
5. Save

### 3. Test the System (Dietician)

1. Login as dietician
2. Navigate to `/dietician/clients`
3. You should see your assigned clients
4. Click on a client to view details
5. Test creating a diet plan
6. Test creating a subscription

---

## Step 6: Configure Razorpay Webhooks (Production)

For automatic payment verification in production:

1. Go to Razorpay Dashboard → Webhooks
2. Create new webhook
3. Set URL: `https://yourdomain.com/api/webhooks/razorpay`
4. Select events:
   - `payment.captured`
   - `payment.failed`
   - `order.paid`
5. Copy webhook secret
6. Add to `.env.local`:
   ```env
   RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
   ```

---

## Step 7: Test Payment Flow

### Test Mode (Razorpay Test Keys)

1. Create a subscription with payment link
2. Use Razorpay test card:
   - **Card Number:** 4111 1111 1111 1111
   - **CVV:** Any 3 digits
   - **Expiry:** Any future date
3. Complete payment
4. Verify subscription status changes to "active"

### Manual Payment Test

1. Create subscription with "Manual" payment method
2. Click "Mark as Paid"
3. Enter transaction ID
4. Verify status changes

---

## Step 8: Verify Installation

### Checklist

- [ ] Razorpay package installed
- [ ] Environment variables configured
- [ ] Admin user created
- [ ] At least one subscription plan created
- [ ] At least one client assigned to dietician
- [ ] Dietician can view assigned clients
- [ ] Can create diet plan for client
- [ ] Can create subscription for client
- [ ] Payment link generates successfully
- [ ] Manual payment marking works

---

## Common Issues & Solutions

### Issue: "Razorpay not configured" error

**Solution:** 
- Check `.env.local` has correct Razorpay keys
- Restart development server after adding env variables
- Verify keys are not wrapped in quotes

### Issue: Clients not showing for dietician

**Solution:**
- Ensure client is assigned to dietician in admin panel
- Check user role is exactly "dietitian" (lowercase)
- Verify database connection

### Issue: Payment link not generating

**Solution:**
- Check Razorpay account is active
- Verify API keys are correct
- Check browser console for errors
- Ensure amount is greater than 0

### Issue: TypeScript errors

**Solution:**
```bash
npm install --save-dev @types/razorpay
```

---

## File Permissions

Ensure these files are created and accessible:

```
✅ src/lib/db/models/SubscriptionPlan.ts
✅ src/lib/db/models/ClientSubscription.ts
✅ src/app/api/admin/subscription-plans/route.ts
✅ src/app/api/subscriptions/route.ts
✅ src/app/api/subscriptions/[id]/route.ts
✅ src/app/api/subscriptions/verify-payment/route.ts
✅ src/app/admin/subscription-plans/page.tsx
✅ src/app/dietician/clients/page.tsx
✅ src/app/dietician/clients/[id]/page.tsx
✅ src/components/dietician/ClientDetailsTab.tsx
✅ src/components/dietician/ClientDietPlanTab.tsx
✅ src/components/dietician/ClientPaymentsTab.tsx
```

---

## Development vs Production

### Development (Test Mode)
- Use Razorpay test keys
- Test with dummy card numbers
- No real money transactions
- Webhook not required

### Production (Live Mode)
- Use Razorpay live keys
- Real payment processing
- Configure webhooks
- SSL certificate required
- Set `NEXTAUTH_URL` to production domain

---

## Next Steps After Installation

1. **Customize Plans:** Create plans specific to your business
2. **Import Clients:** Bulk import existing clients
3. **Train Staff:** Train dieticians on the system
4. **Test Thoroughly:** Test all payment scenarios
5. **Go Live:** Switch to production Razorpay keys
6. **Monitor:** Track subscriptions and payments

---

## Support & Resources

### Documentation
- Main Documentation: `DIETICIAN_CLIENT_MANAGEMENT_SYSTEM.md`
- Razorpay Docs: [https://razorpay.com/docs](https://razorpay.com/docs)

### Testing Resources
- Razorpay Test Cards: [https://razorpay.com/docs/payments/payments/test-card-details/](https://razorpay.com/docs/payments/payments/test-card-details/)

---

## Security Checklist

- [ ] Environment variables not committed to git
- [ ] Razorpay keys kept secret
- [ ] HTTPS enabled in production
- [ ] Webhook signature verification enabled
- [ ] Role-based access control tested
- [ ] Payment amounts validated server-side

---

**Installation Complete! 🎉**

You're now ready to manage clients, create diet plans, and process payments through the Zoconut-style system.

For detailed usage instructions, refer to `DIETICIAN_CLIENT_MANAGEMENT_SYSTEM.md`

