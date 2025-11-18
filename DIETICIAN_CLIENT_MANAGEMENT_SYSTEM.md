# Dietician Client Management System (Zoconut-Style)

## Overview
Complete client management system for dieticians with subscription plans, Razorpay payment integration, diet plan management, and client tracking.

---

## 🎯 Features

### 1. **Admin - Subscription Plan Management**
- Create, edit, and delete subscription plans
- Configure plan details:
  - Name, description, category
  - Price and duration (days/weeks/months)
  - Included features (consultations, follow-ups, video calls)
  - Diet plan inclusion, chat support
- Activate/deactivate plans
- View all plans with filtering

**Location:** `/admin/subscription-plans`

### 2. **Dietician - Client Management**
- View only assigned clients
- Client listing with search functionality
- Client details with tabs:
  - **Details Tab:** Basic info, health goals, medical conditions, allergies
  - **Diet Plan Tab:** Create and manage diet plans
  - **Payments Tab:** Manage subscriptions and payments

**Location:** `/dietician/clients`

### 3. **Payment Management**
- **Razorpay Integration:**
  - Generate payment links
  - Automatic payment verification
  - Webhook support
- **Manual Payment Options:**
  - Cash
  - Bank transfer
  - Manual entry with transaction ID
- Mark payments as paid manually
- View payment history per client

### 4. **Diet Plan Management**
- Create personalized diet plans for clients
- Set calorie targets and macros
- 7-day meal planning
- Activate/deactivate plans
- Multiple plans per client

---

## 📁 File Structure

### Models
```
src/lib/db/models/
├── SubscriptionPlan.ts          # Subscription plan schema
├── ClientSubscription.ts        # Client subscription records
├── MealPlan.ts                  # Diet plan schema (existing)
└── User.ts                      # User model (existing)
```

### API Routes
```
src/app/api/
├── admin/
│   └── subscription-plans/
│       └── route.ts             # CRUD for subscription plans
├── subscriptions/
│   ├── route.ts                 # Create/list subscriptions
│   ├── [id]/route.ts            # Update/delete subscription
│   └── verify-payment/route.ts # Razorpay payment verification
└── users/
    └── clients/route.ts         # Get assigned clients (existing)
```

### Pages
```
src/app/
├── admin/
│   └── subscription-plans/
│       └── page.tsx             # Admin plan management
└── dietician/
    └── clients/
        ├── page.tsx             # Client listing
        └── [id]/page.tsx        # Client details with tabs
```

### Components
```
src/components/dietician/
├── ClientDetailsTab.tsx         # Client basic info
├── ClientDietPlanTab.tsx        # Diet plan management
└── ClientPaymentsTab.tsx        # Payment & subscription management
```

---

## 🔧 Environment Variables

Add these to your `.env.local`:

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# App URL for payment callbacks
NEXTAUTH_URL=http://localhost:3000
```

---

## 🚀 Usage Guide

### For Admins

#### 1. Create Subscription Plans
1. Navigate to `/admin/subscription-plans`
2. Click "Create Plan"
3. Fill in plan details:
   - Name (e.g., "Weight Loss - 3 Months")
   - Category (weight-loss, diabetes, etc.)
   - Price in INR
   - Duration and type
   - Included services
   - Features list
4. Click "Create Plan"

#### 2. Manage Plans
- Edit existing plans
- Activate/deactivate plans
- Delete unused plans
- View all plans at a glance

### For Dieticians

#### 1. View Assigned Clients
1. Navigate to `/dietician/clients`
2. See all clients assigned to you
3. Search by name or email
4. Click "View" to see client details

#### 2. Manage Client Details
1. Click on a client card
2. View tabs:
   - **Details:** Health info, goals, restrictions
   - **Diet Plan:** Create and manage diet plans
   - **Payments:** Handle subscriptions

#### 3. Create Diet Plan
1. Go to client's "Diet Plan" tab
2. Click "Create Diet Plan"
3. Set plan details:
   - Name and description
   - Start and end dates
   - Calorie targets
   - 7-day meal schedule
4. Save and activate

#### 4. Manage Payments

##### Option A: Razorpay Payment Link
1. Go to client's "Payments" tab
2. Click "Add Subscription"
3. Select a plan
4. Choose "Razorpay (Online)"
5. Check "Generate payment link"
6. Click "Create Subscription"
7. Copy and share the payment link with client
8. Payment is auto-verified when client pays

##### Option B: Manual Payment
1. Go to client's "Payments" tab
2. Click "Add Subscription"
3. Select a plan
4. Choose payment method:
   - Manual
   - Cash
   - Bank Transfer
5. Add notes (optional)
6. Click "Create Subscription"
7. When payment is received, click "Mark as Paid"
8. Enter transaction ID (optional)

---

## 🔄 Payment Flow

### Razorpay Payment Link Flow
```
1. Dietician creates subscription with "Generate payment link"
   ↓
2. System creates Razorpay order and payment link
   ↓
3. Dietician shares link with client
   ↓
4. Client pays via Razorpay
   ↓
5. Razorpay webhook verifies payment
   ↓
6. Subscription status updated to "active"
   ↓
7. Payment status updated to "paid"
```

### Manual Payment Flow
```
1. Dietician creates subscription with manual payment method
   ↓
2. Subscription created with "pending" status
   ↓
3. Client pays via cash/bank transfer
   ↓
4. Dietician clicks "Mark as Paid"
   ↓
5. Enters transaction ID (optional)
   ↓
6. Subscription activated
```

---

## 📊 Database Schema

### SubscriptionPlan
```typescript
{
  name: string;
  description?: string;
  duration: number;
  durationType: 'days' | 'weeks' | 'months';
  price: number;
  currency: string;
  features: string[];
  category: string;
  isActive: boolean;
  consultationsIncluded: number;
  dietPlanIncluded: boolean;
  followUpsIncluded: number;
  chatSupport: boolean;
  videoCallsIncluded: number;
  createdBy: ObjectId;
}
```

### ClientSubscription
```typescript
{
  client: ObjectId;
  dietitian: ObjectId;
  plan: ObjectId;
  startDate: Date;
  endDate: Date;
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod: 'razorpay' | 'manual' | 'cash' | 'bank-transfer';
  amount: number;
  currency: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  paymentLink?: string;
  transactionId?: string;
  paidAt?: Date;
  notes?: string;
  consultationsUsed: number;
  followUpsUsed: number;
  videoCallsUsed: number;
}
```

---

## 🔐 Security & Permissions

### Role-Based Access Control

| Feature | Admin | Dietician | Client |
|---------|-------|-----------|--------|
| Create Plans | ✅ | ❌ | ❌ |
| View Plans | ✅ | ✅ | ❌ |
| Create Subscriptions | ✅ | ✅ | ❌ |
| View Own Subscriptions | ✅ | ✅ | ✅ |
| Mark as Paid | ✅ | ✅ | ❌ |
| View Assigned Clients | ✅ | ✅ | ❌ |
| Create Diet Plans | ✅ | ✅ | ❌ |

---

## 🎨 UI/UX Features

- **Clean Card-Based Design:** Modern, professional interface
- **Color-Coded Status:** Visual indicators for payment and subscription status
- **Responsive Layout:** Works on desktop and mobile
- **Search & Filter:** Easy client and plan discovery
- **Tab Navigation:** Organized client information
- **One-Click Actions:** Quick payment link generation
- **Copy to Clipboard:** Easy payment link sharing

---

## 📝 Next Steps

### Recommended Enhancements
1. **Email Notifications:**
   - Send payment links via email
   - Payment confirmation emails
   - Subscription expiry reminders

2. **WhatsApp Integration:**
   - Send payment links via WhatsApp
   - Automated reminders

3. **Analytics Dashboard:**
   - Revenue tracking
   - Subscription analytics
   - Client retention metrics

4. **Automated Renewals:**
   - Auto-generate renewal reminders
   - One-click renewal links

5. **Client Portal:**
   - Clients can view their subscriptions
   - Download invoices
   - Make payments directly

---

## 🐛 Troubleshooting

### Payment Link Not Generated
- Check Razorpay credentials in `.env.local`
- Verify Razorpay account is active
- Check API logs for errors

### Clients Not Showing
- Ensure clients are assigned to dietician in admin panel
- Check user role is set to DIETITIAN
- Verify database connection

### Payment Not Verified
- Check Razorpay webhook configuration
- Verify webhook secret matches
- Check webhook endpoint is accessible

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review API logs in browser console
3. Verify environment variables
4. Check database connections

---

## ✅ Checklist for Going Live

- [ ] Configure Razorpay production keys
- [ ] Set up Razorpay webhooks
- [ ] Create initial subscription plans
- [ ] Assign clients to dieticians
- [ ] Test payment flow end-to-end
- [ ] Set up email notifications
- [ ] Configure backup system
- [ ] Train dieticians on the system

---

**Version:** 1.0.0  
**Last Updated:** 2025-10-15  
**Author:** Zoconut Development Team

