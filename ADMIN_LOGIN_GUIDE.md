# 🔐 Admin Login Guide

## ✅ **Admin Credentials Created!**

I've created an admin user for you in the database.

---

## 🎯 **Admin Login Credentials**

```
📧 Email:    admin@dtps.com
🔑 Password: admin123
```

---

## 🚀 **How to Login**

### **Step 1: Go to Login Page**
```
http://localhost:3001/auth/signin
```

### **Step 2: Enter Credentials**
- **Email:** `admin@dtps.com`
- **Password:** `admin123`

### **Step 3: Click "Sign In"**

### **Step 4: You Should Redirect To:**
```
http://localhost:3001/dashboard/admin
```

---

## 🔍 **If Not Redirecting - Troubleshooting**

### **Issue 1: Check Browser Console**
1. Open DevTools (F12)
2. Go to Console tab
3. Look for errors
4. Share the error message with me

### **Issue 2: Check Network Tab**
1. Open DevTools (F12)
2. Go to Network tab
3. Try logging in
4. Look for failed requests (red)
5. Check the response

### **Issue 3: Clear Browser Cache**
```
1. Press Ctrl + Shift + Delete
2. Clear cookies and cache
3. Try logging in again
```

### **Issue 4: Check Server is Running**
```bash
# Make sure your dev server is running
npm run dev

# Should show:
# ▲ Next.js 15.5.0
# - Local:        http://localhost:3001
```

### **Issue 5: Check Session**
After login, open DevTools Console and run:
```javascript
// Check if session exists
fetch('/api/auth/session').then(r => r.json()).then(console.log)
```

---

## 🐛 **Common Issues**

### **1. "Invalid email or password"**
**Solution:** Run the create-admin script again:
```bash
node create-admin.js
```

### **2. "Redirecting but page not found (404)"**
**Solution:** Check if admin dashboard exists:
```bash
ls -la src/app/dashboard/admin/page.tsx
```

### **3. "Stuck on login page"**
**Possible causes:**
- Session not being created
- NextAuth configuration issue
- Database connection issue

**Solution:** Check terminal for errors

### **4. "Redirects to wrong page"**
**Check:** Make sure role is 'admin' in database:
```javascript
// In MongoDB or Compass
db.users.findOne({ email: 'admin@dtps.com' })
// Should show: role: 'admin'
```

---

## 📋 **Redirect Logic**

The login page uses this logic:

```typescript
if (session?.user) {
  const redirectUrl = 
    session.user.role === 'dietitian' || session.user.role === 'health_counselor'
      ? '/dashboard/dietitian'
      : session.user.role === 'admin'
      ? '/dashboard/admin'
      : '/client-dashboard';

  router.push(redirectUrl);
}
```

So:
- **Admin** → `/dashboard/admin`
- **Dietitian** → `/dashboard/dietitian`
- **Client** → `/client-dashboard`

---

## 🔧 **Debug Steps**

### **1. Check if user exists:**
```bash
node create-admin.js
```

### **2. Check browser console:**
```
F12 → Console tab → Look for errors
```

### **3. Check network requests:**
```
F12 → Network tab → Try login → Look for failed requests
```

### **4. Check session after login:**
```javascript
// In browser console after login
fetch('/api/auth/session').then(r => r.json()).then(console.log)
```

### **5. Check terminal for errors:**
```
Look at your terminal where npm run dev is running
Check for any error messages
```

---

## 📱 **Expected Behavior**

### **On Desktop:**
1. See gray card login UI
2. Enter admin credentials
3. Click "Sign In"
4. Brief loading state
5. Redirect to `/dashboard/admin`
6. See admin dashboard with sidebar

### **On Mobile:**
1. See gradient login UI
2. Enter admin credentials
3. Click "Sign In"
4. Brief loading state
5. Redirect to `/dashboard/admin`
6. See admin dashboard (responsive)

---

## 🎯 **Quick Test**

```bash
# 1. Make sure server is running
npm run dev

# 2. Open browser
http://localhost:3001/auth/signin

# 3. Login with:
Email: admin@dtps.com
Password: admin123

# 4. Should redirect to:
http://localhost:3001/dashboard/admin
```

---

## 💡 **Additional Admin Accounts**

If you need more admin accounts, you can:

### **Option 1: Modify the script**
Edit `create-admin.js` and change the email/password

### **Option 2: Use the signup page**
1. Go to `/auth/signup`
2. Create account
3. Manually change role to 'admin' in database

### **Option 3: Create via MongoDB**
```javascript
db.users.insertOne({
  email: "admin2@dtps.com",
  password: "$2a$10$...", // bcrypt hash of password
  firstName: "Admin",
  lastName: "Two",
  role: "admin",
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date()
})
```

---

## 🆘 **Still Not Working?**

If you're still having issues:

1. **Share the error message** from browser console
2. **Share the terminal output** where npm run dev is running
3. **Share a screenshot** of what you see
4. **Tell me what happens** when you click "Sign In"

I'll help you debug it! 🚀

---

## ✅ **Summary**

**Admin Credentials:**
- Email: `admin@dtps.com`
- Password: `admin123`

**Login URL:**
- `http://localhost:3001/auth/signin`

**Expected Redirect:**
- `http://localhost:3001/dashboard/admin`

**If not working:**
- Check browser console (F12)
- Check terminal for errors
- Run `node create-admin.js` again
- Clear browser cache

---

**You should now be able to login as admin!** 🎉

