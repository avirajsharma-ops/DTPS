# Quick Start Guide - Zoconut-Style Client Management

## 🚀 What Was Built

A complete **Zoconut-style client management system** for dieticians with:

✅ **Subscription Plans** (Admin creates plans)  
✅ **Razorpay Payment Integration** (Payment links + Manual payments)  
✅ **Dietician Client Management** (View only assigned clients)  
✅ **Diet Plan Creation** (Personalized meal plans)  
✅ **Payment Management** (Track subscriptions & payments)

---

## 📦 What You Need to Do

### 1. Install Razorpay Package

```bash
npm install razorpay
```

### 2. Add Environment Variables

Add to `.env.local`:

```env
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
```

Get keys from: [https://razorpay.com](https://razorpay.com) → Settings → API Keys

### 3. Restart Your Dev Server

```bash
npm run dev
```

---

## 🎯 How to Use

### **For Admins:**

#### Create Subscription Plans
1. Go to: `/admin/subscription-plans`
2. Click "Create Plan"
3. Fill details (name, price, duration, features)
4. Save

**Example Plan:**
- Name: "Weight Loss - 3 Months"
- Price: ₹4999
- Duration: 3 months
- Consultations: 6
- Follow-ups: 4

---

### **For Dieticians:**

#### View Your Clients
1. Go to: `/dietician/clients`
2. See all clients assigned to you
3. Click on a client to view details

#### Create Diet Plan
1. Open client details
2. Go to "Diet Plan" tab
3. Click "Create Diet Plan"
4. Set meals for 7 days
5. Save

#### Manage Payments

**Option A: Razorpay Payment Link**
1. Open client details
2. Go to "Payments" tab
3. Click "Add Subscription"
4. Select plan
5. Choose "Razorpay"
6. Check "Generate payment link"
7. Copy link and share with client

**Option B: Manual Payment**
1. Same steps as above
2. Choose "Manual" or "Cash"
3. When client pays, click "Mark as Paid"

---

## 📁 New Files Created

### Models
- `src/lib/db/models/SubscriptionPlan.ts`
- `src/lib/db/models/ClientSubscription.ts`

### API Routes
- `src/app/api/admin/subscription-plans/route.ts`
- `src/app/api/subscriptions/route.ts`
- `src/app/api/subscriptions/[id]/route.ts`
- `src/app/api/subscriptions/verify-payment/route.ts`

### Pages
- `src/app/admin/subscription-plans/page.tsx`
- `src/app/dietician/clients/page.tsx`
- `src/app/dietician/clients/[id]/page.tsx`

### Components
- `src/components/dietician/ClientDetailsTab.tsx`
- `src/components/dietician/ClientDietPlanTab.tsx`
- `src/components/dietician/ClientPaymentsTab.tsx`

---

## 🔑 Key Features

### 1. **Subscription Plans (Admin)**
- Create unlimited plans
- Set price, duration, features
- Activate/deactivate plans
- Categories: Weight Loss, Diabetes, PCOS, etc.

### 2. **Client Management (Dietician)**
- View only YOUR assigned clients
- Search and filter clients
- View client health details
- Track client progress

### 3. **Diet Plan Management**
- Create personalized meal plans
- 7-day meal scheduling
- Set calorie targets
- Multiple plans per client
- Activate/deactivate plans

### 4. **Payment Management**
- **Razorpay Integration:**
  - Auto-generate payment links
  - Share via WhatsApp/Email
  - Auto-verify payments
  - Secure payment processing

- **Manual Payments:**
  - Cash payments
  - Bank transfers
  - Manual entry with transaction ID
  - Mark as paid manually

### 5. **Client Details Tabs**
- **Details:** Health info, BMI, goals, allergies
- **Diet Plan:** Create and manage meal plans
- **Payments:** Subscriptions and payment history

---

## 🎨 UI Features

- ✨ Modern card-based design
- 🎨 Color-coded status badges
- 📱 Fully responsive
- 🔍 Search functionality
- 📊 Clean data visualization
- 🚀 Fast and intuitive

---

## 🔒 Security & Permissions

| Feature | Admin | Dietician | Client |
|---------|-------|-----------|--------|
| Create Plans | ✅ | ❌ | ❌ |
| View Assigned Clients | All | Own | ❌ |
| Create Subscriptions | ✅ | ✅ | ❌ |
| Create Diet Plans | ✅ | ✅ | ❌ |
| Mark Payments Paid | ✅ | ✅ | ❌ |

---

## 🧪 Testing

### Test Razorpay Payment (Test Mode)

1. Create subscription with payment link
2. Use test card:
   - **Card:** 4111 1111 1111 1111
   - **CVV:** 123
   - **Expiry:** 12/25
3. Complete payment
4. Verify subscription becomes "active"

### Test Manual Payment

1. Create subscription with "Manual" method
2. Click "Mark as Paid"
3. Enter transaction ID
4. Verify status changes

---

## 📊 Workflow Example

### Complete Client Onboarding Flow

1. **Admin creates plan:**
   - "Weight Loss - 3 Months" - ₹4999

2. **Admin assigns client to dietician:**
   - Go to `/admin/clients`
   - Assign client to dietician

3. **Dietician views client:**
   - Go to `/dietician/clients`
   - Click on client

4. **Dietician creates subscription:**
   - Go to "Payments" tab
   - Select plan
   - Generate Razorpay link
   - Share with client

5. **Client pays:**
   - Clicks payment link
   - Completes payment
   - Subscription auto-activated

6. **Dietician creates diet plan:**
   - Go to "Diet Plan" tab
   - Create 7-day meal plan
   - Activate plan

7. **Client starts program:**
   - Receives diet plan
   - Follows meal schedule
   - Tracks progress

---

## 🐛 Common Issues

### "Razorpay not configured"
→ Add Razorpay keys to `.env.local` and restart server

### "No clients showing"
→ Ensure clients are assigned to dietician in admin panel

### "Payment link not generating"
→ Check Razorpay keys are correct and account is active

---

## 📚 Documentation

- **Full Documentation:** `DIETICIAN_CLIENT_MANAGEMENT_SYSTEM.md`
- **Installation Guide:** `INSTALLATION_GUIDE.md`
- **This Quick Start:** `QUICK_START.md`

---

## ✅ Next Steps

1. ✅ Install Razorpay: `npm install razorpay`
2. ✅ Add environment variables
3. ✅ Restart dev server
4. ✅ Create first subscription plan (as admin)
5. ✅ Assign a client to yourself (as admin)
6. ✅ Test creating subscription
7. ✅ Test creating diet plan
8. ✅ Test payment flow

---

## 🎉 You're Ready!

The system is now complete and ready to use. You have:

- ✅ Subscription plan management
- ✅ Razorpay payment integration
- ✅ Client management for dieticians
- ✅ Diet plan creation
- ✅ Payment tracking
- ✅ Manual payment options

**Start by creating your first subscription plan at `/admin/subscription-plans`**

---

## 💡 Pro Tips

1. **Create multiple plan tiers:**
   - Basic (1 month)
   - Standard (3 months)
   - Premium (6 months)

2. **Use payment links for convenience:**
   - Share via WhatsApp
   - Send via email
   - Post on social media

3. **Track everything:**
   - Monitor active subscriptions
   - Track payment status
   - Review client progress

4. **Customize plans:**
   - Different categories (Weight Loss, Diabetes, etc.)
   - Flexible pricing
   - Custom features per plan

---

**Need Help?** Check the full documentation in `DIETICIAN_CLIENT_MANAGEMENT_SYSTEM.md`

**Happy Managing! 🚀**

