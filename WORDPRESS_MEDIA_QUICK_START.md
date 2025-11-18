# WordPress Media Integration - Quick Start

## ✅ What I Created

I've created a complete WordPress media integration with **two implementations**:

### 1. **Server Component Version** (Recommended)
- **File**: `src/app/wordpress-media/page.tsx`
- **URL**: `http://localhost:3000/wordpress-media`
- Uses Next.js Server Actions
- Better for SEO and performance

### 2. **Client Component Version** (Better UX)
- **File**: `src/app/wordpress-media-client/page.tsx`
- **URL**: `http://localhost:3000/wordpress-media-client`
- Uses API routes
- No page reload needed

### 3. **API Route**
- **File**: `src/app/api/wordpress/media/route.ts`
- **Endpoints**:
  - `GET /api/wordpress/media` - Fetch media
  - `POST /api/wordpress/media` - Upload media

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Add Environment Variables

Create or update `.env.local`:

```env
WP_BASE=https://dtps.app/wp-json/dtps/v1
WP_API_KEY=dtps_live_7JpQ6QfE2w3r9T1L
WP_API_SECRET=dtps_secret_bS8mN2kL5xP0vY4R
```

**⚠️ IMPORTANT**: Replace `https://your-wordpress-site.com` with your actual WordPress URL!

### Step 2: Start Development Server

```bash
npm run dev
```

### Step 3: Test It!

Visit one of these URLs:
- **Server version**: `http://localhost:3000/wordpress-media`
- **Client version**: `http://localhost:3000/wordpress-media-client`

Upload an image and see it appear in the gallery!

---

## 📸 Features

✅ **Upload images to WordPress**
- Drag & drop or click to select
- Add title, alt text, caption
- Instant feedback

✅ **Display WordPress media gallery**
- Grid layout
- Responsive design
- Image metadata (title, alt, caption, date, ID)

✅ **Full WordPress integration**
- Uses your WordPress API
- Saves to WordPress media library
- Fetches from WordPress database

---

## 🔍 Which Version Should I Use?

### Use **Server Component** (`/wordpress-media`) if:
- ✅ You want better SEO
- ✅ You want server-side rendering
- ✅ You don't mind page reload after upload
- ✅ You want smaller JavaScript bundle

### Use **Client Component** (`/wordpress-media-client`) if:
- ✅ You want better user experience
- ✅ You don't want page reload
- ✅ You want instant feedback
- ✅ You prefer client-side interactions

**Both work perfectly!** Choose based on your needs.

---

## 🐛 Common Issues & Fixes

### Issue: "Failed to fetch media"

**Fix**:
1. Check `.env.local` has correct `WP_BASE` URL
2. Verify WordPress API is accessible
3. Test with curl:
   ```bash
   curl -H "X-Api-Key: dtps_live_7JpQ6QfE2w3r9T1L" \
        -H "X-Api-Secret: dtps_secret_bS8mN2kL5xP0vY4R" \
        https://your-wordpress-site.com/wp-json/dtps/v1/media
   ```

### Issue: "Upload failed"

**Fix**:
1. Check file is an image (JPG, PNG, GIF, WebP)
2. Check file size (should be < 10MB)
3. Verify WordPress upload permissions
4. Check browser console for errors

### Issue: Images not displaying

**Fix**:
1. Verify image URLs are publicly accessible
2. Check CORS settings on WordPress
3. Open image URL directly in browser to test

---

## 📁 File Structure

```
src/
├── app/
│   ├── wordpress-media/
│   │   └── page.tsx                    # Server Component version
│   ├── wordpress-media-client/
│   │   └── page.tsx                    # Client Component version
│   └── api/
│       └── wordpress/
│           └── media/
│               └── route.ts            # API route
├── .env.local                          # Your environment variables
└── .env.example                        # Template
```

---

## 🎯 How to Use in Your App

### Fetch Media

```typescript
// Client-side
const res = await fetch('/api/wordpress/media?per_page=24&page=1');
const data = await res.json();
console.log(data.items); // Array of media
console.log(data.total); // Total count
```

### Upload Media

```typescript
// Client-side
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('title', 'My Image');
formData.append('alt', 'SEO description');
formData.append('caption', 'Image caption');

const res = await fetch('/api/wordpress/media', {
  method: 'POST',
  body: formData,
});
const uploaded = await res.json();
console.log(uploaded.id); // WordPress media ID
console.log(uploaded.source_url); // Image URL
```

---

## 🔐 Security Checklist

- ✅ Environment variables in `.env.local` (not committed to git)
- ✅ API credentials not hardcoded
- ✅ File type validation (images only)
- ✅ File size limits
- ✅ HTTPS connection to WordPress

---

## 📚 Full Documentation

See `WORDPRESS_MEDIA_INTEGRATION.md` for:
- Detailed API documentation
- Troubleshooting guide
- Customization options
- Production deployment
- Security best practices

---

## ✨ Summary

**What you can do now**:
1. ✅ Upload images to WordPress from Next.js
2. ✅ Fetch and display WordPress media
3. ✅ Add title, alt text, and captions
4. ✅ View media gallery with metadata
5. ✅ Choose between server or client implementation

**Next steps**:
1. Set up `.env.local` with your WordPress URL
2. Visit `/wordpress-media` or `/wordpress-media-client`
3. Upload a test image
4. Customize the styling to match your app

**Need help?** Check `WORDPRESS_MEDIA_INTEGRATION.md` for detailed troubleshooting!

