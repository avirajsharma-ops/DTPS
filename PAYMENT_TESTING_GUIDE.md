# 🧪 Payment Detection - Testing & Verification Guide

## Quick Test (5 minutes)

### **Step 1: Create a Test Payment Link** (1 min)
1. Navigate to Admin → Payments section
2. Click "Create Payment Link"
3. Select client (any client)
4. Select service plan (e.g., "30-Day Weight Loss Plan")
5. Verify amount shows correctly
6. Copy payment link

### **Step 2: Make a Test Payment** (2 min)
1. Click payment link in new tab
2. Use Razorpay test card: `4111 1111 1111 1111`
3. Expiry: any future date (e.g., 12/25)
4. CVV: any 3 digits (e.g., 123)
5. Complete payment
6. Should see confirmation

### **Step 3: Check Planning Section** (2 min)
1. Go to client dashboard
2. Navigate to Planning section
3. **Check:** Does payment show?
   - ✅ Green card: "Active Plan: [Plan Name]"
   - ✅ Shows remaining days
   - ✅ "Create New Plan" button enabled

4. **If NOT showing:**
   - Click "🔄 Sync Payment Status"
   - Wait 2-3 seconds
   - Check if payment appears

### **Step 4: Create Meal Plan** (Optional)
1. Click "Create New Plan"
2. Should allow meal plan creation
3. Select recipes and save
4. Verify meal plan appears

---

## Detailed Testing Checklist

### **Phase 1: Database Verification** ✅

**Check 1: PaymentLink Created**
```javascript
// In MongoDB console
db.paymentlinks.find({
  client: ObjectId("YOUR_CLIENT_ID")
}).sort({ createdAt: -1 }).limit(1).pretty()

// Should show:
{
  _id: ObjectId(...),
  status: "paid",          // ✅ MUST BE "paid"
  paidAt: ISODate(...),    // ✅ MUST HAVE TIMESTAMP
  razorpayPaymentId: "pay_...",  // ✅ MUST EXIST
  finalAmount: 4500,       // ✅ AMOUNT CORRECT
  durationDays: 30         // ✅ DURATION CORRECT
}
```

**Check 2: ClientPurchase Created**
```javascript
// In MongoDB console
db.clientpurchases.find({
  client: ObjectId("YOUR_CLIENT_ID"),
  status: "active"
}).pretty()

// Should show:
{
  _id: ObjectId(...),
  client: ObjectId(...),
  status: "active",        // ✅ MUST BE "active"
  paymentLink: ObjectId(...),  // ✅ REFERENCES PaymentLink
  finalAmount: 4500,       // ✅ MATCHES PaymentLink
  durationDays: 30,        // ✅ MATCHES PaymentLink
  endDate: ISODate(...),   // ✅ MUST BE IN FUTURE
  daysUsed: 0              // ✅ STARTS AT 0
}
```

**Check 3: Payment Record Created** ✅ NEW
```javascript
// In MongoDB console
db.payments.find({
  client: ObjectId("YOUR_CLIENT_ID"),
  status: "COMPLETED"
}).pretty()

// Should show:
{
  _id: ObjectId(...),
  client: ObjectId(...),
  type: "service_plan",    // ✅ CORRECT TYPE
  amount: 4500,            // ✅ AMOUNT CORRECT
  status: "COMPLETED",     // ✅ MUST BE "COMPLETED"
  transactionId: "pay_...",  // ✅ RAZORPAY ID
  description: "Payment for 30-Day Weight Loss Plan..."
}
```

### **Phase 2: Frontend Verification** ✅

**Check 1: Browser Console Logs**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for logs:

```
✅ Payment check successful: {
  hasPaidPlan: true,
  remainingDays: 28,
  attempt: 1
}
```

**Should see one of:**
- ✅ Success message with remaining days
- ⏳ Retry messages (normal if webhook delayed)
- ❌ Final failure message (means payment not found)

**Check 2: Planning Section Display**
- [ ] Green card showing plan details
- [ ] Shows remaining days
- [ ] Shows plan duration
- [ ] "Create New Plan" button is ENABLED (blue)
- [ ] No error messages

**Check 3: Toast Notifications**
- [ ] Saw toast: "🔄 Syncing payment status..."
- [ ] Saw toast: "✅ Payment detected! X days available"
- [ ] No error toasts

### **Phase 3: API Response Verification** ✅

**Check 1: GET Request (Automatic)**
```
URL: /api/client-purchases/check?clientId={clientId}
Method: GET

Response Should Be:
{
  success: true,
  hasPaidPlan: true,        // ✅ KEY FIELD
  canCreateMealPlan: true,
  remainingDays: 28,        // ✅ > 0
  totalPurchasedDays: 30,
  purchase: {
    planName: "30-Day Weight Loss Plan",
    durationDays: 30,
    status: "active"
  }
}
```

**Check 2: POST Request (Force Sync)**
```
URL: /api/client-purchases/check
Method: POST
Body: {
  clientId: "...",
  forceSync: true
}

Response Should Be:
{
  success: true,
  hasPaidPlan: true,
  syncedCount: 1,          // ✅ NUMBER OF SYNCED PAYMENTS
  message: "✅ Force sync complete! Client has 28 days remaining."
}
```

### **Phase 4: Webhook Verification** ✅

**Check 1: Razorpay Webhook Status**
1. Login to Razorpay Dashboard
2. Go to Settings → Webhooks
3. Click on your webhook
4. Check "Recent Deliveries"
5. Look for events: `payment.link.completed`

**Should see:**
- ✅ Event delivered successfully (HTTP 200)
- ✅ Recent timestamp (within 1 minute of payment)
- ✅ Payload contains correct payment ID

**Check 2: Server Logs**
```
Webhook handler should log:
✅ Razorpay webhook event: payment.link.completed
✅ Payment link {linkId} marked as paid
✅ Created ClientPurchase {purchaseId}
✅ Created Payment record {paymentId}
```

### **Phase 5: Integration Test** ✅

**Test Scenario: Complete Payment Flow**

```
Step 1: Create Payment Link
        ↓
Step 2: Client Completes Payment
        ↓
Step 3: Wait 3 seconds (for webhook)
        ↓
Step 4: Check Planning Section
        ├─ Option A: Payment shows automatically ✅
        └─ Option B: Click "🔄 Sync Payment Status" ✅
        ↓
Step 5: Verify Payment Details Shown
        ├─ Plan name correct
        ├─ Days remaining correct
        ├─ Amount paid correct
        └─ Start/end dates correct
        ↓
Step 6: Click "Create New Plan"
        ├─ Dialog opens
        ├─ Duration field pre-filled with remaining days
        ├─ Can select recipes
        └─ Can save plan
        ↓
Step 7: Verify Meal Plan Created
        ├─ Plan appears in list
        ├─ Shows correct number of days
        ├─ Can view meal details
        └─ daysUsed updated in purchase
```

---

## Troubleshooting Tests

### **If Payment Not Showing:**

**Test 1: Check Database Records**
```javascript
// Run in MongoDB
db.paymentlinks.countDocuments({ 
  client: ObjectId("clientId"),
  status: "paid" 
})

// Result:
// 0 = Payment never completed in Razorpay
// 1+ = Payment exists, check ClientPurchase next
```

**Test 2: Check ClientPurchase**
```javascript
db.clientpurchases.countDocuments({
  client: ObjectId("clientId"),
  status: "active"
})

// Result:
// 0 = Webhook didn't create purchase
// 1+ = Purchase exists, check why not showing
```

**Test 3: Check API Directly**
```bash
# In terminal/Postman
curl -X GET "http://localhost:3000/api/client-purchases/check?clientId=YOUR_CLIENT_ID"

# Check response for:
# - hasPaidPlan: true/false
# - remainingDays: number
# - error: string (if any)
```

**Test 4: Force Sync Test**
```bash
curl -X POST "http://localhost:3000/api/client-purchases/check" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "YOUR_CLIENT_ID",
    "forceSync": true
  }'

# Should return:
# - syncedCount: how many payments synced
# - hasPaidPlan: true (after sync)
```

**Test 5: Check Razorpay**
1. Login to Razorpay Dashboard
2. Go to Payments
3. Find payment by amount or client email
4. Verify status: "Completed"
5. Check payment ID

### **If Webhook Not Triggering:**

**Test 1: Webhook Configuration**
```javascript
// Verify in code
process.env.RAZORPAY_WEBHOOK_SECRET  // Should exist
process.env.RAZORPAY_KEY_ID           // Should exist
process.env.RAZORPAY_KEY_SECRET       // Should exist
```

**Test 2: Webhook Endpoint Accessible**
```bash
curl -X POST "http://your-domain.com/api/webhooks/razorpay" \
  -H "x-razorpay-signature: test" \
  -d '{"event": "payment.link.completed"}'

# Should NOT return 404
```

**Test 3: Server Logs**
- Check server console for webhook logs
- Should see `Razorpay webhook event:` message
- Should see `Payment link ... marked as paid`

---

## Performance Tests

### **Test 1: Page Load Speed**
1. Open Planning Section
2. Watch browser Network tab
3. Measure time to payment detection:
   - **Target:** < 5 seconds (first check)
   - **Range:** 3-15 seconds (retries if needed)

### **Test 2: Force Sync Speed**
1. Click "🔄 Sync Payment Status"
2. Measure time to response:
   - **Target:** < 2 seconds
   - **If slower:** Check Razorpay API latency

### **Test 3: Database Query Speed**
1. Monitor database logs
2. Check ClientPurchase queries:
   - **Target:** < 100ms per query
   - **If slower:** Check indexes

---

## Automated Test Cases

### **Test Case 1: Normal Payment Flow**
```javascript
// 1. Create PaymentLink
const link = await PaymentLink.create({...})

// 2. Simulate webhook
await handlePaymentLinkCompleted({
  payment_link: { id: link.razorpayPaymentLinkId, status: 'paid' },
  payment: { entity: { id: 'pay_123' } }
})

// 3. Verify records created
const clientPurchase = await ClientPurchase.findOne({ paymentLink: link._id })
assert(clientPurchase, "ClientPurchase should exist")
assert.equal(clientPurchase.status, "active")

const payment = await Payment.findOne({ transactionId: 'pay_123' })
assert(payment, "Payment should exist")
assert.equal(payment.status, "COMPLETED")
```

### **Test Case 2: Missed Webhook Recovery**
```javascript
// 1. Create paid PaymentLink but NO ClientPurchase
const link = await PaymentLink.create({
  status: 'paid',
  razorpayPaymentId: 'pay_123',
  durationDays: 30,
  servicePlanId: planId
})

// 2. Call check endpoint
const response = await GET({ clientId })

// 3. Verify ClientPurchase was created
assert.equal(response.hasPaidPlan, true)
assert(response.remainingDays > 0)

const clientPurchase = await ClientPurchase.findOne({ paymentLink: link._id })
assert(clientPurchase, "ClientPurchase should be created automatically")
```

### **Test Case 3: Force Sync**
```javascript
// 1. Create pending PaymentLink (not paid in DB)
const link = await PaymentLink.create({
  status: 'pending',
  razorpayPaymentId: 'pay_123'
})

// 2. Mock Razorpay API to return paid status
// 3. Call POST endpoint with forceSync
const response = await POST({ clientId, forceSync: true })

// 4. Verify sync happened
assert.equal(response.syncedCount, 1)
assert.equal(response.hasPaidPlan, true)

// 5. Verify PaymentLink updated
const updatedLink = await PaymentLink.findById(link._id)
assert.equal(updatedLink.status, 'paid')
```

---

## Test Results Template

```markdown
## Test Results - [Date]

### Database Verification
- [ ] PaymentLink exists with status: "paid"
- [ ] ClientPurchase exists with status: "active"
- [ ] Payment record exists with status: "COMPLETED"

### Frontend Verification
- [ ] Console logs show successful payment check
- [ ] Planning section shows green card with plan details
- [ ] Remaining days displayed correctly
- [ ] Create New Plan button is enabled

### API Verification
- [ ] GET /api/client-purchases/check returns hasPaidPlan: true
- [ ] POST /api/client-purchases/check (force sync) works
- [ ] API response includes all required fields

### Webhook Verification
- [ ] Webhook triggered (check Razorpay dashboard)
- [ ] Server logs show webhook handling
- [ ] All records created by webhook

### Integration Test
- [ ] Payment detected within 5 seconds
- [ ] OR force sync finds payment immediately
- [ ] Meal plan can be created successfully
- [ ] daysUsed updated when plan created

### Issues Found
- [List any issues]

### Status
- ✅ PASS / ❌ FAIL
```

---

## Sign-Off Checklist

Before marking payment feature as complete:

- [x] All database records created (PaymentLink, Payment, ClientPurchase)
- [x] Frontend detects payment automatically
- [x] Force sync button works
- [x] Meal plan can be created after payment
- [x] No console errors
- [x] No database errors
- [x] Webhook triggers successfully
- [x] Recovery works if webhook fails
- [x] Proper error messages shown
- [x] Logging for debugging

**Final Status:** ✅ **READY FOR PRODUCTION**

---

**Last Updated:** December 13, 2025  
**Test Author:** Payment Feature Team
