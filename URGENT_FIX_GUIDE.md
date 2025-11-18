# 🚨 URGENT FIX GUIDE - Recipe Upload to WordPress

## ❌ Problem

You set `WP_BASE=https://dtps.app/wp-json/dtps/v1` which is **WRONG**!

## ✅ Solution

### Step 1: Fix `.env.local`

Open `.env.local` and change:

```env
# ❌ WRONG
WP_BASE=https://dtps.app/wp-json/dtps/v1

# ✅ CORRECT
WP_BASE=https://dtps.app
```

**IMPORTANT**: 
- WP_BASE should be **ONLY the domain**
- Do NOT include `/wp-json/dtps/v1`
- The API path is added automatically by the code

### Step 2: Restart Dev Server

```bash
# Stop server (Ctrl+C in terminal)
# Then restart:
npm run dev
```

### Step 3: Test Recipe Upload

1. Go to `http://localhost:3000/recipes/create`
2. Fill in recipe details
3. Upload an image
4. Submit

---

## 🔧 What I Fixed

### 1. ✅ Fixed WP_BASE in `.env.example`

Changed from:
```env
WP_BASE=https://dtps.app/wp-json/dtps/v1
```

To:
```env
WP_BASE=https://dtps.app
```

### 2. ✅ Fixed HTML Hydration Error

Changed `<p>` tags to `<div>` tags to fix React hydration error:

**Before**:
```tsx
<p className="text-sm text-gray-500 flex items-center gap-2">
  <LoadingSpinner className="h-4 w-4" />
  Uploading image...
</p>
```

**After**:
```tsx
<div className="text-sm text-gray-500 flex items-center gap-2">
  <LoadingSpinner className="h-4 w-4" />
  Uploading image...
</div>
```

### 3. ✅ Updated Recipe Upload to Use WordPress

Changed upload endpoint from `/api/upload` to `/api/wordpress/media`:

**Before**:
```tsx
const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData,
});
```

**After**:
```tsx
const response = await fetch('/api/wordpress/media', {
  method: 'POST',
  body: formData,
});
```

Now images will be uploaded to WordPress server and the URL will be saved in your database!

---

## 📊 How It Works Now

### Upload Flow:

1. **User selects image** → Recipe create page
2. **Upload to WordPress** → `/api/wordpress/media` endpoint
3. **WordPress saves image** → Returns image URL
4. **Save URL to database** → Recipe stored with WordPress image URL
5. **Display image** → Fetched from WordPress server

### API Endpoints:

```
POST /api/wordpress/media
→ Uploads to: https://dtps.app/wp-json/dtps/v1/media
→ Returns: { url: "https://dtps.app/wp-content/uploads/2025/10/recipe.jpg", ... }
```

---

## 🧪 Test WordPress Connection

### Test 1: Check WordPress API

```bash
curl -H "X-Api-Key: dtps_live_7JpQ6QfE2w3r9T1L" \
     -H "X-Api-Secret: dtps_secret_bS8mN2kL5xP0vY4R" \
     https://dtps.app/wp-json/dtps/v1/media
```

**Expected Response**:
```json
{
  "items": [...],
  "total": 10
}
```

### Test 2: Upload Test Image

```bash
curl -X POST \
  -H "X-Api-Key: dtps_live_7JpQ6QfE2w3r9T1L" \
  -H "X-Api-Secret: dtps_secret_bS8mN2kL5xP0vY4R" \
  -F "file=@test-image.jpg" \
  -F "title=Test Recipe Image" \
  https://dtps.app/wp-json/dtps/v1/media
```

**Expected Response**:
```json
{
  "id": 123,
  "url": "https://dtps.app/wp-content/uploads/2025/10/test-image.jpg",
  "title": "Test Recipe Image"
}
```

---

## 🐛 Troubleshooting

### Issue: "Failed to upload image to WordPress"

**Check 1: Verify WP_BASE**

```bash
# In .env.local, should be:
WP_BASE=https://dtps.app

# NOT:
WP_BASE=https://dtps.app/wp-json/dtps/v1
```

**Check 2: Test WordPress API**

```bash
curl https://dtps.app/wp-json/dtps/v1/media
```

Should return JSON (not 404).

**Check 3: Verify API Credentials**

Make sure `.env.local` has:
```env
WP_API_KEY=dtps_live_7JpQ6QfE2w3r9T1L
WP_API_SECRET=dtps_secret_bS8mN2kL5xP0vY4R
```

**Check 4: Check Browser Console**

Open browser console (F12) and look for errors:
- Network tab → Check `/api/wordpress/media` request
- Console tab → Check for error messages

---

### Issue: "Recipe creation failed: {}"

**Possible Causes**:

1. **Image upload failed** → Check WordPress connection
2. **Missing required fields** → Fill all fields
3. **Database error** → Check MongoDB connection

**Debug Steps**:

1. **Check browser console**:
   ```
   F12 → Console tab
   Look for error messages
   ```

2. **Check server logs**:
   ```
   Terminal running `npm run dev`
   Look for error messages
   ```

3. **Test without image**:
   - Don't upload image
   - Try creating recipe
   - If works → Image upload is the issue

---

## 📝 Your `.env.local` Should Look Like This

```env
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/zoconut

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# WordPress Integration
WP_BASE=https://dtps.app
WP_API_KEY=dtps_live_7JpQ6QfE2w3r9T1L
WP_API_SECRET=dtps_secret_bS8mN2kL5xP0vY4R

# Other services...
```

---

## ✅ Checklist

Before testing, make sure:

- [ ] `.env.local` has `WP_BASE=https://dtps.app` (NOT `/wp-json/dtps/v1`)
- [ ] `.env.local` has correct API key and secret
- [ ] Dev server restarted after changing `.env.local`
- [ ] WordPress API is accessible (test with curl)
- [ ] Browser console is open to see errors

---

## 🎯 Quick Test

1. **Fix `.env.local`**:
   ```env
   WP_BASE=https://dtps.app
   ```

2. **Restart server**:
   ```bash
   npm run dev
   ```

3. **Test upload**:
   - Go to `http://localhost:3000/recipes/create`
   - Fill recipe name: "Test Recipe"
   - Upload an image
   - Check browser console for errors
   - Submit recipe

4. **Check result**:
   - Should see success message
   - Image should be uploaded to WordPress
   - Recipe should be created with WordPress image URL

---

## 🚀 What Happens Now

### Before (Old Way):
```
User uploads image
  ↓
Saved to MongoDB (GridFS)
  ↓
Image stored in database
  ↓
Large database size
```

### After (New Way):
```
User uploads image
  ↓
Uploaded to WordPress server
  ↓
WordPress returns image URL
  ↓
URL saved to MongoDB
  ↓
Image served from WordPress
  ↓
Smaller database, faster loading
```

---

## 📞 Still Having Issues?

1. **Share the error message** from browser console
2. **Share the error message** from server logs
3. **Test WordPress API** with curl command above
4. **Check `.env.local`** file contents

---

## 🎉 Summary

### What I Fixed:
1. ✅ Corrected WP_BASE format in `.env.example`
2. ✅ Fixed HTML hydration error (changed `<p>` to `<div>`)
3. ✅ Updated recipe upload to use WordPress API

### What You Need to Do:
1. ✅ Fix `.env.local` → Change `WP_BASE=https://dtps.app`
2. ✅ Restart dev server
3. ✅ Test recipe upload

### Expected Result:
- ✅ Images upload to WordPress server
- ✅ WordPress returns image URL
- ✅ Recipe saved with WordPress image URL
- ✅ Images display from WordPress server

