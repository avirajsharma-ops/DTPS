# 🥗 Zoconut-Style Client Management System

> Complete dietician-client management system with subscription plans, Razorpay payments, and diet plan management.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install razorpay
```

### 2. Configure Environment
Add to `.env.local`:
```env
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
```

### 3. Start Using
```bash
npm run dev
```

Visit:
- **Admin:** `/admin/subscription-plans` - Create plans
- **Dietician:** `/dietician/clients` - Manage clients

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| **QUICK_START.md** | 5-minute overview and usage guide |
| **INSTALLATION_GUIDE.md** | Detailed setup instructions |
| **DIETICIAN_CLIENT_MANAGEMENT_SYSTEM.md** | Complete feature documentation |
| **IMPLEMENTATION_SUMMARY.md** | Technical implementation details |
| **CLEANUP_GUIDE.md** | Remove old pages guide |

**Start here:** Read `QUICK_START.md` first!

---

## ✨ Features

### 🎯 For Admins
- Create subscription plans (price, duration, features)
- Manage plan categories (Weight Loss, Diabetes, PCOS, etc.)
- Assign clients to dieticians
- View all subscriptions and payments

### 👨‍⚕️ For Dieticians
- View only assigned clients
- Create personalized diet plans
- Generate Razorpay payment links
- Accept manual payments (cash, bank transfer)
- Track client subscriptions
- Manage client health details

### 💳 Payment Options
- **Razorpay:** Auto-generate payment links
- **Manual:** Cash, bank transfer with transaction tracking
- **Auto-verification:** Razorpay payments verified automatically
- **Payment history:** Track all client payments

---

## 🏗️ System Architecture

### Database Models
```
SubscriptionPlan     → Admin creates plans
ClientSubscription   → Tracks client subscriptions
MealPlan            → Diet plans for clients
User                → Clients, dieticians, admins
```

### Key Pages
```
/admin/subscription-plans        → Manage plans
/dietician/clients              → Client list
/dietician/clients/[id]         → Client details
  ├─ Details Tab                → Health info
  ├─ Diet Plan Tab              → Meal plans
  └─ Payments Tab               → Subscriptions
```

### API Routes
```
/api/admin/subscription-plans   → CRUD plans
/api/subscriptions              → Manage subscriptions
/api/subscriptions/verify-payment → Razorpay verification
/api/users/clients              → Get assigned clients
```

---

## 🔄 Workflow

### Admin Creates Plan
```
1. Go to /admin/subscription-plans
2. Click "Create Plan"
3. Set: Name, Price, Duration, Features
4. Save
```

### Dietician Manages Client
```
1. Go to /dietician/clients
2. Click on client
3. Create diet plan (Diet Plan tab)
4. Create subscription (Payments tab)
5. Share payment link with client
```

### Client Pays
```
Option A: Razorpay
1. Client receives payment link
2. Clicks link and pays
3. Payment auto-verified
4. Subscription activated

Option B: Manual
1. Client pays cash/bank transfer
2. Dietician clicks "Mark as Paid"
3. Enters transaction ID
4. Subscription activated
```

---

## 📊 Example Plans

### Weight Loss - 1 Month
- **Price:** ₹2,999
- **Duration:** 1 month
- **Includes:** 4 consultations, 2 follow-ups, diet plan, chat support

### Weight Loss - 3 Months
- **Price:** ₹7,999
- **Duration:** 3 months
- **Includes:** 12 consultations, 6 follow-ups, diet plan, chat support, 2 video calls

### Diabetes Management - 6 Months
- **Price:** ₹14,999
- **Duration:** 6 months
- **Includes:** 24 consultations, 12 follow-ups, diet plan, chat support, 4 video calls

---

## 🎨 UI Preview

### Admin - Subscription Plans
```
┌─────────────────────────────────────────┐
│  Subscription Plans          [+ Create] │
├─────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐    │
│  │ Weight Loss  │  │ Diabetes     │    │
│  │ 3 Months     │  │ 6 Months     │    │
│  │ ₹7,999       │  │ ₹14,999      │    │
│  │ [Edit] [Del] │  │ [Edit] [Del] │    │
│  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────┘
```

### Dietician - Client Details
```
┌─────────────────────────────────────────┐
│  John Doe                    [Active]   │
│  john@example.com                       │
├─────────────────────────────────────────┤
│  [Details] [Diet Plan] [Payments]       │
├─────────────────────────────────────────┤
│  Payments Tab:                          │
│  ┌───────────────────────────────────┐  │
│  │ Weight Loss - 3 Months            │  │
│  │ ₹7,999 | Active | Paid            │  │
│  │ [Copy Payment Link]               │  │
│  └───────────────────────────────────┘  │
│  [+ Add Subscription]                   │
└─────────────────────────────────────────┘
```

---

## 🔐 Security

### Role-Based Access
- **Admin:** Full access to all features
- **Dietician:** Access only to assigned clients
- **Client:** View own subscriptions and diet plans

### Payment Security
- Razorpay signature verification
- Secure webhook handling
- Server-side validation
- No sensitive data in frontend

---

## 🧪 Testing

### Test Razorpay (Test Mode)
```
Card: 4111 1111 1111 1111
CVV: 123
Expiry: 12/25
```

### Test Manual Payment
1. Create subscription with "Manual" method
2. Click "Mark as Paid"
3. Enter transaction ID
4. Verify status changes to "active"

---

## 📦 What's Included

### 16 New Files Created

**Models (2):**
- SubscriptionPlan.ts
- ClientSubscription.ts

**API Routes (4):**
- /api/admin/subscription-plans/route.ts
- /api/subscriptions/route.ts
- /api/subscriptions/[id]/route.ts
- /api/subscriptions/verify-payment/route.ts

**Pages (3):**
- /admin/subscription-plans/page.tsx
- /dietician/clients/page.tsx
- /dietician/clients/[id]/page.tsx

**Components (3):**
- ClientDetailsTab.tsx
- ClientDietPlanTab.tsx
- ClientPaymentsTab.tsx

**Documentation (4):**
- QUICK_START.md
- INSTALLATION_GUIDE.md
- DIETICIAN_CLIENT_MANAGEMENT_SYSTEM.md
- IMPLEMENTATION_SUMMARY.md

---

## 🎯 Key Benefits

✅ **Zoconut-Style Workflow** - Professional client management  
✅ **Razorpay Integration** - Automated payment links  
✅ **Manual Payments** - Flexible payment options  
✅ **Client Filtering** - Dieticians see only their clients  
✅ **Diet Plan Integration** - Seamless meal planning  
✅ **Subscription Tracking** - Monitor all subscriptions  
✅ **Clean UI** - Modern, responsive design  
✅ **Secure** - Role-based access control  

---

## 🚦 Getting Started

### Step 1: Setup (5 minutes)
1. Install Razorpay: `npm install razorpay`
2. Add Razorpay keys to `.env.local`
3. Restart server

### Step 2: Create Plans (Admin)
1. Go to `/admin/subscription-plans`
2. Create 2-3 plans (1 month, 3 months, 6 months)

### Step 3: Assign Clients (Admin)
1. Go to `/admin/clients`
2. Assign clients to dieticians

### Step 4: Start Managing (Dietician)
1. Go to `/dietician/clients`
2. Click on a client
3. Create diet plan
4. Create subscription
5. Share payment link

---

## 💡 Pro Tips

1. **Create tiered plans:** Basic, Standard, Premium
2. **Use payment links:** Easy to share via WhatsApp
3. **Track everything:** Monitor subscriptions and payments
4. **Customize features:** Add/remove features per plan
5. **Test thoroughly:** Use Razorpay test mode first

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Razorpay not configured" | Add keys to `.env.local` and restart |
| No clients showing | Assign clients to dietician in admin panel |
| Payment link not generating | Check Razorpay keys and account status |
| TypeScript errors | Run `npm install --save-dev @types/razorpay` |

---

## 📞 Support

- **Documentation:** Check the 4 guide files
- **Razorpay Docs:** https://razorpay.com/docs
- **Test Cards:** https://razorpay.com/docs/payments/payments/test-card-details/

---

## ✅ Checklist

Before going live:

- [ ] Install Razorpay package
- [ ] Configure environment variables
- [ ] Create subscription plans
- [ ] Assign clients to dieticians
- [ ] Test payment flow (test mode)
- [ ] Test manual payments
- [ ] Test diet plan creation
- [ ] Switch to Razorpay live keys
- [ ] Configure webhooks (production)
- [ ] Train dieticians on system

---

## 🎉 You're Ready!

The complete Zoconut-style client management system is now set up and ready to use.

**Next Step:** Read `QUICK_START.md` for detailed usage instructions.

---

**Version:** 1.0.0  
**Created:** 2025-10-15  
**License:** Proprietary  
**Author:** Zoconut Development Team

---

## 📖 Quick Links

- [Quick Start Guide](QUICK_START.md) - Start here!
- [Installation Guide](INSTALLATION_GUIDE.md) - Detailed setup
- [Full Documentation](DIETICIAN_CLIENT_MANAGEMENT_SYSTEM.md) - Complete reference
- [Implementation Details](IMPLEMENTATION_SUMMARY.md) - Technical specs
- [Cleanup Guide](CLEANUP_GUIDE.md) - Remove old pages

---

**Happy Managing! 🚀**

