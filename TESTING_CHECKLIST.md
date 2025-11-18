# Testing Checklist - Zoconut Client Management System

## ✅ Issues Fixed

### 1. **Razorpay Package Installed**
- ✅ Installed `razorpay` package via npm
- ✅ Environment variables already configured in `.env.local`

### 2. **Client Details Page TypeError Fixed**
- ✅ Fixed API response handling (API returns `{ user }`, not direct user object)
- ✅ Added safety checks for `firstName` and `lastName` in avatar fallback
- ✅ Changed `client.firstName[0]` to `client.firstName?.[0] || 'U'`
- ✅ Changed `client.lastName[0]` to `client.lastName?.[0] || 'N'`

### 3. **Client List Page Safety Checks**
- ✅ Added optional chaining to filter function
- ✅ Added safety checks for avatar fallback

---

## 🧪 Testing Steps

### **Step 1: Restart Development Server**

```bash
# Stop current server (Ctrl+C)
# Then restart:
npm run dev
```

**Expected:** Server starts without errors on http://localhost:3000

---

### **Step 2: Test Admin - Create Subscription Plan**

1. **Login as Admin**
   - Go to: http://localhost:3000/auth/signin
   - Login with admin credentials

2. **Navigate to Subscription Plans**
   - Go to: http://localhost:3000/admin/subscription-plans
   - **Expected:** Page loads without errors

3. **Create a Test Plan**
   - Click "Create Plan" button
   - Fill in:
     - Name: "Weight Loss - 1 Month"
     - Description: "Basic weight loss program"
     - Category: "weight-loss"
     - Price: 2999
     - Duration: 1
     - Duration Type: "months"
     - Consultations: 4
     - Follow-ups: 2
     - Diet Plan Included: Yes
     - Chat Support: Yes
   - Click "Create Plan"
   - **Expected:** Plan created successfully, appears in list

4. **Verify Plan Display**
   - **Expected:** Plan card shows:
     - Name, price, duration
     - Features list
     - Active badge
     - Edit/Delete buttons

---

### **Step 3: Test Admin - Assign Client to Dietician**

1. **Navigate to Clients**
   - Go to: http://localhost:3000/admin/clients
   - **Expected:** List of all clients

2. **Assign Client**
   - Find a client
   - Click "Assign" or "Edit"
   - Select a dietician from dropdown
   - Save
   - **Expected:** Client assigned successfully

---

### **Step 4: Test Dietician - View Assigned Clients**

1. **Logout and Login as Dietician**
   - Logout from admin
   - Login with dietician credentials

2. **Navigate to My Clients**
   - Go to: http://localhost:3000/dietician/clients
   - **Expected:** 
     - Page loads without errors
     - Shows ONLY clients assigned to this dietician
     - Client count displayed
     - Search box visible

3. **Test Search**
   - Type client name in search box
   - **Expected:** Filters clients in real-time

4. **Verify Client Cards**
   - **Expected:** Each card shows:
     - Avatar with initials
     - Name and email
     - Status badge
     - Phone number (if available)
     - Join date
     - Health goals (if available)
     - Action buttons: View, Diet Plan, Payments, Message

---

### **Step 5: Test Client Details Page**

1. **Click "View" on a Client**
   - Click "View" button on any client card
   - **Expected:** 
     - Redirects to `/dietician/clients/[id]`
     - Page loads WITHOUT the TypeError
     - Client header displays correctly
     - Avatar shows initials (not error)

2. **Verify Client Header**
   - **Expected:**
     - Avatar with correct initials
     - Full name
     - Email and phone
     - Status badge
     - Gender badge (if available)
     - Join date

3. **Verify Tabs**
   - **Expected:** Three tabs visible:
     - Details
     - Diet Plan
     - Payments

---

### **Step 6: Test Details Tab**

1. **Click "Details" Tab**
   - **Expected:** Shows:
     - Basic Information (age, gender, height, weight)
     - BMI calculation
     - Health Goals
     - Medical Conditions
     - Dietary Restrictions
     - Allergies

2. **Verify BMI Calculation**
   - **Expected:** 
     - If height and weight exist, BMI calculated
     - BMI category shown (Underweight/Normal/Overweight/Obese)
     - Color-coded badge

---

### **Step 7: Test Diet Plan Tab**

1. **Click "Diet Plan" Tab**
   - **Expected:** 
     - Shows list of existing diet plans (if any)
     - "Create Diet Plan" button visible

2. **Click "Create Diet Plan"**
   - **Expected:** 
     - Redirects to `/meal-plans/create?clientId=[id]`
     - Meal plan creation form loads

3. **Verify Plan Actions**
   - **Expected:** Each plan has:
     - View button
     - Edit button
     - Activate/Deactivate toggle
     - Delete button

---

### **Step 8: Test Payments Tab (Critical)**

1. **Click "Payments" Tab**
   - **Expected:** 
     - Page loads WITHOUT "Module not found: razorpay" error
     - Shows list of subscriptions (if any)
     - "Add Subscription" button visible

2. **Click "Add Subscription"**
   - **Expected:** 
     - Dialog opens
     - Plan dropdown populated with active plans
     - Payment method options visible:
       - Razorpay (Online)
       - Manual
       - Cash
       - Bank Transfer

3. **Test Razorpay Payment Link**
   - Select a plan
   - Choose "Razorpay" payment method
   - Check "Generate payment link"
   - Add notes (optional)
   - Click "Create Subscription"
   - **Expected:**
     - Subscription created
     - Payment link generated
     - Alert shows payment link
     - Subscription appears in list

4. **Verify Payment Link**
   - **Expected:**
     - Payment link displayed in subscription card
     - "Copy Link" button works
     - Link format: `https://rzp.io/...`

5. **Test Manual Payment**
   - Click "Add Subscription" again
   - Select a plan
   - Choose "Manual" payment method
   - Add notes
   - Click "Create Subscription"
   - **Expected:**
     - Subscription created with "Pending" payment status
     - "Mark as Paid" button visible

6. **Test Mark as Paid**
   - Click "Mark as Paid" on manual subscription
   - Enter transaction ID (optional)
   - **Expected:**
     - Payment status changes to "Paid"
     - Subscription status changes to "Active"
     - "Mark as Paid" button disappears

---

### **Step 9: Test Subscription Display**

1. **Verify Subscription Cards**
   - **Expected:** Each subscription shows:
     - Plan name
     - Amount and currency
     - Start and end dates
     - Subscription status badge (Active/Expired/Pending)
     - Payment status badge (Paid/Pending/Failed)
     - Payment method
     - Payment link (if Razorpay)
     - Transaction ID (if manual)
     - Notes (if any)

2. **Verify Status Colors**
   - **Expected:**
     - Active: Green
     - Expired: Gray
     - Pending: Yellow
     - Cancelled: Red
     - Paid: Green
     - Pending Payment: Yellow

---

### **Step 10: Test Navigation**

1. **Test Back Button**
   - Click "Back to Clients" button
   - **Expected:** Returns to `/dietician/clients`

2. **Test Tab Navigation via URL**
   - Go to: `/dietician/clients/[id]?tab=diet-plan`
   - **Expected:** Diet Plan tab opens by default
   - Go to: `/dietician/clients/[id]?tab=payments`
   - **Expected:** Payments tab opens by default

3. **Test Quick Actions from Client List**
   - From client list, click "Diet Plan" button
   - **Expected:** Opens client details with Diet Plan tab active
   - Click "Payments" button
   - **Expected:** Opens client details with Payments tab active

---

## 🔍 Error Checking

### **Check Browser Console**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Navigate through all pages
4. **Expected:** No errors (warnings are OK)

### **Check Network Tab**
1. Open Network tab in DevTools
2. Test creating subscription
3. **Expected:**
   - POST to `/api/subscriptions` returns 200
   - Response contains subscription object
   - If Razorpay, response contains `paymentLink`

### **Check Server Logs**
1. Check terminal where `npm run dev` is running
2. **Expected:** No errors during:
   - Page loads
   - API calls
   - Subscription creation

---

## ✅ Success Criteria

All of the following should work without errors:

- [ ] Admin can create subscription plans
- [ ] Admin can assign clients to dieticians
- [ ] Dietician sees only assigned clients
- [ ] Client list page loads without errors
- [ ] Client details page loads without TypeError
- [ ] Avatar initials display correctly
- [ ] All three tabs work (Details, Diet Plan, Payments)
- [ ] Details tab shows client information
- [ ] Diet Plan tab shows meal plans
- [ ] Payments tab loads without "Module not found" error
- [ ] Can create subscription with Razorpay
- [ ] Payment link generates successfully
- [ ] Can copy payment link
- [ ] Can create manual payment subscription
- [ ] Can mark manual payment as paid
- [ ] Subscription status updates correctly
- [ ] All badges display with correct colors
- [ ] Navigation works correctly
- [ ] Search works in client list
- [ ] No console errors
- [ ] No TypeScript errors

---

## 🐛 If Issues Persist

### **Issue: "Module not found: razorpay"**
**Solution:**
```bash
# Ensure package is installed
npm install razorpay

# Restart dev server
npm run dev
```

### **Issue: "Cannot read properties of undefined"**
**Solution:**
- Check if API returns correct data structure
- Verify `{ user }` vs direct user object
- Check optional chaining is used (`?.`)

### **Issue: Payment link not generating**
**Solution:**
- Check `.env.local` has Razorpay keys
- Verify keys are correct (no quotes, no spaces)
- Check Razorpay account is active
- Check browser console for errors

### **Issue: Clients not showing**
**Solution:**
- Verify client is assigned to dietician in database
- Check `assignedDietitian` field in User model
- Verify API filters by `assignedDietitian`

---

## 📊 Test Data Recommendations

### **Create Test Plans:**
1. Weight Loss - 1 Month - ₹2,999
2. Weight Loss - 3 Months - ₹7,999
3. Diabetes Management - 6 Months - ₹14,999

### **Create Test Clients:**
1. Assign at least 2-3 clients to test dietician
2. Ensure clients have:
   - First name and last name
   - Email
   - Phone (optional)
   - Height and weight (for BMI)
   - Health goals

---

## 🎉 Final Verification

After all tests pass:

1. ✅ System works end-to-end
2. ✅ No errors in console
3. ✅ All features functional
4. ✅ Ready for production use

---

**Last Updated:** 2025-10-15  
**Version:** 1.0.0

