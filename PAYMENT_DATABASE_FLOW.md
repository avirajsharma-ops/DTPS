# 💳 Complete Payment Database Flow & Schema Documentation

## Overview
When a client completes a payment in the system, payment details are saved across **3 interconnected database collections** with full traceability and audit trail.

---

## 🔄 Payment Flow Diagram

```
1. Admin Creates Payment Link
   ↓
2. Payment Link Sent to Client
   ↓
3. Client Pays via Razorpay
   ↓
4. Razorpay Webhook Triggered
   ↓
5. THREE Database Records Created:
   ├─ PaymentLink Updated (status: 'paid')
   ├─ Payment Record Created (Payment schema)
   └─ ClientPurchase Created (ServicePlan schema)
   ↓
6. Payment Status Available in Planning Section
```

---

## 📊 Database Collections & Data Saved

### 1. 🔗 **PaymentLink Schema** 
**Location:** `/models/PaymentLink.ts`  
**Purpose:** Tracks Razorpay payment links and transaction details

**Data Saved When Payment Complete:**
```javascript
{
  _id: ObjectId,
  client: ObjectId,           // Reference to User (client)
  dietitian: ObjectId,        // Reference to User (dietitian)
  
  // ✅ Payment Amount Details
  amount: 5000,              // Base amount in INR
  tax: 500,                  // Tax amount
  discount: 1000,            // Discount applied
  finalAmount: 4500,         // ✅ FINAL PAID AMOUNT
  currency: "INR",
  
  // ✅ Plan Details
  planCategory: "weight-loss",
  planName: "30-Day Weight Loss Plan",
  durationDays: 30,
  duration: "30 Days",
  
  // ✅ Razorpay Transaction Details
  razorpayPaymentLinkId: "plink_12345abc",
  razorpayPaymentId: "pay_6789xyz",  // ✅ PAYMENT ID
  razorpayOrderId: "order_11111aaa",
  razorpaySignature: "signature_value",
  
  // ✅ Additional Payment Details
  transactionId: "pay_6789xyz",
  paymentMethod: "card",              // ✅ card/upi/netbanking/wallet
  payerEmail: "client@example.com",  // ✅ PAYER INFO
  payerPhone: "+91-9999999999",      // ✅ PAYER PHONE
  payerName: "John Doe",              // ✅ PAYER NAME
  
  // Card/Bank Details (if applicable)
  bank: "HDFC Bank",                  // For netbanking
  wallet: "PayPal",                   // For wallet
  vpa: "user@upi",                    // For UPI
  cardLast4: "4242",                  // For cards
  cardNetwork: "Visa",                // Visa/Mastercard
  
  // ✅ Status & Dates
  status: "paid",                     // ✅ PAYMENT COMPLETED
  paidAt: 2025-12-13T10:30:00Z,      // ✅ PAYMENT TIME
  expireDate: 2025-12-25T23:59:59Z,
  
  // Timestamps
  createdAt: 2025-12-10T14:00:00Z,
  updatedAt: 2025-12-13T10:30:00Z
}
```

---

### 2. 💰 **Payment Schema** (NEW - Created in Webhook)
**Location:** `/models/Payment.ts`  
**Purpose:** General payment transaction record for accounting & history

**Data Saved When Payment Completes:**
```javascript
{
  _id: ObjectId,
  client: ObjectId,          // Reference to User (client)
  dietitian: ObjectId,       // Reference to User (dietitian)
  
  // ✅ Payment Details
  type: "service_plan",      // Payment type
  amount: 4500,              // ✅ FINAL AMOUNT PAID
  currency: "INR",           // ✅ CURRENCY
  status: "COMPLETED",       // ✅ PAYMENT STATUS
  
  // ✅ Transaction Details
  paymentMethod: "razorpay", // Payment gateway used
  transactionId: "pay_6789xyz", // ✅ RAZORPAY PAYMENT ID
  
  // ✅ Description
  description: "Payment for 30-Day Weight Loss Plan - 30 Days (weight-loss)",
  
  // Timestamps
  createdAt: 2025-12-13T10:30:00Z,  // ✅ When payment processed
  updatedAt: 2025-12-13T10:30:00Z
}
```

---

### 3. 📋 **ClientPurchase Schema** 
**Location:** `/models/ServicePlan.ts`  
**Purpose:** Tracks client's purchased plans and usage

**Data Saved When Payment Completes:**
```javascript
{
  _id: ObjectId,
  client: ObjectId,          // Reference to User (client)
  dietitian: ObjectId,       // Reference to User (dietitian)
  servicePlan: ObjectId,     // Reference to ServicePlan
  paymentLink: ObjectId,     // ✅ Reference to PaymentLink
  
  // ✅ Plan Details at Purchase Time
  planName: "30-Day Weight Loss Plan",
  planCategory: "weight-loss",
  durationDays: 30,          // ✅ Total days purchased
  durationLabel: "30 Days",
  
  // ✅ Payment Details
  baseAmount: 5000,
  discountPercent: 20,       // 20% discount = 1000
  taxPercent: 10,            // 10% tax = 500
  finalAmount: 4500,         // ✅ FINAL PAID AMOUNT
  
  // ✅ Plan Timeline
  purchaseDate: 2025-12-13T10:30:00Z,  // ✅ When payment completed
  startDate: 2025-12-13,     // Plan start date
  endDate: 2026-01-12,       // Plan expiry date
  
  // ✅ Usage Tracking
  status: "active",          // ✅ Plan is active
  mealPlanCreated: false,    // Meal plan created yet?
  daysUsed: 0,               // Days consumed
  
  // Timestamps
  createdAt: 2025-12-13T10:30:00Z,
  updatedAt: 2025-12-13T10:30:00Z
}
```

---

## 🎯 Complete Workflow with Database Operations

### **When Admin Creates Payment Link:**
```
1. Admin clicks "Send Payment Link"
2. System creates PaymentLink record with status: 'created'
3. Razorpay generates payment link URL
4. URL sent to client
```

### **When Client Pays:**
```
1. Client clicks link and completes payment
2. Razorpay processes payment
3. Razorpay sends webhook: "payment.link.completed"
4. Our webhook handler receives event
```

### **Webhook Handler Processes Payment:**
```
Step 1: Update PaymentLink
  → status: 'created' → status: 'paid' ✅
  → paidAt: now ✅
  → razorpayPaymentId: <payment_id> ✅
  → paymentMethod: <method_used> ✅
  → payerEmail: <client_email> ✅
  → payerPhone: <client_phone> ✅

Step 2: Create Payment Record ✅ (NOW IMPLEMENTED)
  → new Payment({
      client: paymentLink.client,
      type: 'service_plan',
      amount: paymentLink.finalAmount,
      status: 'COMPLETED',
      transactionId: razorpayPaymentId,
      description: plan details
    }).save()

Step 3: Create ClientPurchase Record
  → new ClientPurchase({
      client: paymentLink.client,
      servicePlan: paymentLink.servicePlanId,
      planName: paymentLink.planName,
      finalAmount: paymentLink.finalAmount,
      purchaseDate: now,
      status: 'active'
    }).save()
```

---

## 🔍 Payment Verification Flow

### **Planning Section Checks Payment:**
```javascript
// API Call: /api/client-purchases/check?clientId=${clientId}

ClientPurchase.find({
  client: clientId,
  status: 'active',
  endDate: { $gte: new Date() }
})

// Returns:
{
  hasPaidPlan: true,
  purchase: {
    planName: "30-Day Weight Loss Plan",
    remainingDays: 28,
    finalAmount: 4500
  }
}
```

This queries **ClientPurchase** which has reference to **PaymentLink** which has all payment details.

---

## 📈 Payment Status Tracking

### **PaymentLink Status Progression:**
```
created → pending → paid ✅
                  → expired ❌
                  → cancelled ❌
```

### **Payment Schema Status:**
```
PENDING → COMPLETED ✅
       → FAILED ❌
       → REFUNDED (manual)
```

### **ClientPurchase Status:**
```
active ✅
expired (after endDate)
cancelled
```

---

## 🗄️ Database Indexes for Performance

**PaymentLink Collection:**
```javascript
- client: 1, status: 1      // Find payments by client & status
- razorpayPaymentId: 1      // Quick lookup by payment ID
- paidAt: -1                // Recent payments first
```

**Payment Collection:**
```javascript
- client: 1, createdAt: -1  // Client payment history
- status: 1                 // Filter by status
- transactionId: 1          // Unique transaction lookup
```

**ClientPurchase Collection:**
```javascript
- client: 1, status: 1      // Client's active purchases
- client: 1, endDate: -1    // Expire old purchases
```

---

## ✅ What Gets Saved & When

| Field | PaymentLink | Payment | ClientPurchase | When Saved |
|-------|-------------|---------|----------------|-----------|
| **Amount** | ✅ finalAmount | ✅ amount | ✅ finalAmount | Payment completion |
| **Currency** | ✅ currency | ✅ currency | ❌ | Payment completion |
| **Client ID** | ✅ | ✅ | ✅ | Webhook triggers |
| **Razorpay ID** | ✅ razorpayPaymentId | ✅ transactionId | ❌ | Webhook triggers |
| **Payment Method** | ✅ paymentMethod | ✅ paymentMethod | ❌ | Webhook triggers |
| **Payer Details** | ✅ email, phone, name | ❌ | ❌ | Webhook triggers |
| **Plan Details** | ✅ all | ✅ description | ✅ all | Webhook triggers |
| **Payment Date** | ✅ paidAt | ✅ createdAt | ✅ purchaseDate | Webhook triggers |
| **Status** | ✅ 'paid' | ✅ 'COMPLETED' | ✅ 'active' | Webhook triggers |
| **Days Purchased** | ✅ durationDays | ❌ | ✅ durationDays | Webhook triggers |

---

## 🔐 Data Integrity

**Referential Integrity:**
```
Payment
  └─ client → User
  └─ dietitian → User

PaymentLink
  ├─ client → User
  ├─ dietitian → User
  └─ servicePlanId → ServicePlan

ClientPurchase
  ├─ client → User
  ├─ dietitian → User
  ├─ servicePlan → ServicePlan
  └─ paymentLink → PaymentLink ✅
```

**Audit Trail:**
- All records have `createdAt` and `updatedAt` timestamps
- Payment webhook logs all transactions
- Complete history available for each client

---

## 🧪 Testing Payment Flow

### **Check if Payment Was Saved:**

**1. Query PaymentLink:**
```javascript
db.paymentlinks.find({ razorpayPaymentId: "pay_xxxxx" })
// Shows: status, paidAt, payerEmail, amount, etc.
```

**2. Query Payment Record:**
```javascript
db.payments.find({ 
  client: ObjectId("..."),
  status: "COMPLETED" 
})
// Shows: complete transaction record
```

**3. Query ClientPurchase:**
```javascript
db.clientpurchases.find({
  client: ObjectId("..."),
  status: "active"
})
// Shows: plan details and usage
```

**4. Verify in Planning Section:**
- Navigate to Client Dashboard → Planning Section
- Click "🔄 Sync Payment Status"
- Should show: "✅ Payment verified! X days remaining"

---

## 🐛 Debugging Payment Issues

**If payment not showing in planning section:**

1. **Check Webhook Logs:**
   - Verify Razorpay webhook triggered
   - Check console for "Created Payment record"

2. **Query Database:**
   - Verify PaymentLink has status: 'paid'
   - Verify Payment record exists
   - Verify ClientPurchase exists

3. **Force Refresh:**
   - Click "🔄 Sync Payment Status" button
   - Should query database fresh

4. **Check Payment Details:**
   - Verify finalAmount > 0
   - Verify endDate is in future
   - Verify status: 'active'

---

## 📝 Summary

✅ **Payment Details Saved To:**
1. **PaymentLink** - Full Razorpay transaction
2. **Payment** - Payment record (accounting)
3. **ClientPurchase** - Client's purchase record

✅ **Complete Information Tracked:**
- Payment amount & currency
- Payment method used
- Payer details (name, email, phone)
- Payment timestamp
- Transaction ID
- Plan details
- Client & dietitian references

✅ **Accessible From:**
- Planning Section (via ClientPurchase)
- Payment History (via Payment schema)
- Admin Dashboard (all records visible)
- Razorpay Dashboard (external verification)

---

**Last Updated:** December 13, 2025  
**Status:** ✅ All payment details now properly saved to database
