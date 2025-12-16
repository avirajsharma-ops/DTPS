# Payment Flow Debugging Guide

## ✅ What We Fixed

### 1. **Webhook Payment Creation** (`/src/app/api/webhooks/razorpay/route.ts`)
- Enhanced to extract payment method directly from webhook payload
- Creates Payment record with all fields populated
- Creates ClientPurchase and links both records
- Added duplicate checking to prevent re-creation
- Added detailed logging at each step

### 2. **API Payment Retrieval** (`/src/app/api/client-purchases/check/route.ts`)
- Enhanced to search Payment records in 3 ways:
  1. By `clientPurchase` ID (most reliable)
  2. By `paymentLink` ID (fallback)
  3. By `client` ID with COMPLETED status (last resort)
- Returns complete payment details in response
- Added detailed logging for debugging

### 3. **Frontend Display** (`/src/components/clientDashboard/PlanningSection.tsx`)
- Displays payment card when `paymentCheck.payment` exists
- Shows: Amount, Transaction ID, Payment Method, Status
- Already implemented and ready to use

## 📋 Payment Data Flow

```
1. Client makes payment in Razorpay
   ↓
2. Razorpay webhook fires → handlePaymentLinkCompleted()
   ↓
3. Webhook creates:
   - Payment record (with amount, status, method, plan details)
   - ClientPurchase record (with duration, dates, status='active')
   - Links both records together
   ↓
4. Frontend calls GET /api/client-purchases/check
   ↓
5. API finds ClientPurchase + Payment record
   ↓
6. Returns complete response with payment details
   ↓
7. Frontend displays payment card
```

## 🔍 How to Verify

### Step 1: Check Browser Console
1. Open DevTools → Console tab
2. Make a payment
3. You should see logs:
   ```
   🔄 [Initial] Checking payment for client [clientId]
   ✅ Payment check successful: {hasPaidPlan: true, remainingDays: N}
   ```

### Step 2: Check Server Logs
If running locally, you should see:
```
✅ Created Payment record [id] for client [clientId]
   Amount: ₹X, Status: COMPLETED, TransactionId: [id]

✅ Created ClientPurchase [id] for client [clientId]
   PaymentLink Reference: [id]
   Status: active, Duration: N days
   
✅ Updated Payment record with ClientPurchase reference: [id]
```

### Step 3: Check Database
```javascript
// MongoDB shell or MongoDB Compass
db.payments.findOne({ status: 'COMPLETED' })
// Should show: _id, amount, clientPurchase, paymentLink, status, etc.

db.clientpurchases.findOne({ status: 'active' })
// Should show: paymentLink, client, duration, startDate, endDate, etc.
```

### Step 4: Check API Response
In browser DevTools → Network tab:
1. Look for request to `/api/client-purchases/check`
2. Check Response tab
3. Should include:
   ```json
   {
     "success": true,
     "hasPaidPlan": true,
     "payment": {
       "amount": 999,
       "currency": "INR",
       "status": "COMPLETED",
       "paymentMethod": "card",
       "transactionId": "pay_xxxxx",
       "paidAt": "2025-12-13T..."
     }
   }
   ```

### Step 5: Check Frontend Display
In Planning section, you should see:
```
💳 Payment Details
Amount Paid: ₹999
Transaction ID: pay_xxxxx...
Payment Method: Card
Status: Completed
```

## ⚠️ Troubleshooting

### Problem: Payment details not showing

**Check 1: Is webhook being triggered?**
- Look for: `✅ Created Payment record` in server logs
- If missing: Check Razorpay webhook settings

**Check 2: Is Payment record being created?**
- Run: `db.payments.countDocuments()`
- If 0: Webhook not running or failing
- If > 0 but payment not showing: Check clientPurchase linking

**Check 3: Is ClientPurchase being created?**
- Run: `db.clientpurchases.countDocuments()`
- If 0: Webhook not creating it
- If > 0: Check if paymentLink is set correctly

**Check 4: Is API returning payment data?**
- In browser DevTools → Network → check API response
- Should have `"payment": {...}` object
- If null: Payment record not being found

**Check 5: Frontend receiving data?**
- In browser console, run: `window.paymentCheck`
- Should show payment object
- If undefined: Not being set from API response

## 🚀 Quick Test

1. Open Planning section
2. Press F12 → Console tab
3. Click "Force Refresh" button (⟳ icon)
4. Look for detailed logs showing:
   - ✅ Payment check successful
   - ✅ Found Payment record
   - ✅ Payment details returned

If all green checkmarks appear, payment system is working!

## 📞 Final Notes

- Payment records are created in WEBHOOK (not frontend)
- ClientPurchase records are also created in WEBHOOK
- Frontend only DISPLAYS what's in database
- If payment shows in frontend but not database = webhook issue
- If in database but not showing = API or frontend issue

**Both Payment AND ClientPurchase must be created for payment to display.**
