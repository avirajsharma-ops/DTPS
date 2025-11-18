# WordPress Media Integration - Complete Guide

## 🎯 Overview

This integration allows you to upload images to your WordPress server and fetch/display them in your Next.js application.

## 📁 Files Created

1. **`src/app/wordpress-media/page.tsx`** - Server Component version (uses Server Actions)
2. **`src/app/wordpress-media-client/page.tsx`** - Client Component version (uses API routes)
3. **`src/app/api/wordpress/media/route.ts`** - API route for WordPress integration
4. **`.env.example`** - Environment variables template

## 🔧 Setup Instructions

### Step 1: Add Environment Variables

Add these to your `.env.local` file:

```env
WP_BASE=https://your-wordpress-site.com
WP_API_KEY=dtps_live_7JpQ6QfE2w3r9T1L
WP_API_SECRET=dtps_secret_bS8mN2kL5xP0vY4R
```

**Replace `https://your-wordpress-site.com` with your actual WordPress URL!**

### Step 2: Choose Your Implementation

You have **two options**:

#### Option A: Server Component (Recommended)
- **URL**: `/wordpress-media`
- **File**: `src/app/wordpress-media/page.tsx`
- **Pros**: Better SEO, server-side rendering, uses Server Actions
- **Cons**: Requires page reload after upload

#### Option B: Client Component
- **URL**: `/wordpress-media-client`
- **File**: `src/app/wordpress-media-client/page.tsx`
- **Pros**: Better UX, no page reload, instant feedback
- **Cons**: Client-side only, larger bundle

### Step 3: Test the Integration

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Visit the page**:
   - Server version: `http://localhost:3000/wordpress-media`
   - Client version: `http://localhost:3000/wordpress-media-client`

3. **Upload an image**:
   - Select an image file
   - Optionally add title, alt text, and caption
   - Click "Upload"
   - Wait for success message
   - See the image appear in the gallery

## 🔍 How It Works

### Server Component Flow (Option A)

```
User uploads file
    ↓
Server Action (uploadAction)
    ↓
Convert File to Buffer
    ↓
Send to WordPress API
    ↓
WordPress saves image
    ↓
Revalidate page
    ↓
Show updated gallery
```

### Client Component Flow (Option B)

```
User uploads file
    ↓
Client sends FormData to /api/wordpress/media
    ↓
API route receives file
    ↓
Convert and forward to WordPress API
    ↓
WordPress saves image
    ↓
Return response to client
    ↓
Client refreshes gallery
```

## 📡 API Endpoints

### GET `/api/wordpress/media`

Fetch media from WordPress.

**Query Parameters**:
- `per_page` (optional): Number of items per page (default: 24)
- `page` (optional): Page number (default: 1)

**Example**:
```javascript
const res = await fetch('/api/wordpress/media?per_page=24&page=1');
const data = await res.json();
// { items: [...], total: 100 }
```

### POST `/api/wordpress/media`

Upload media to WordPress.

**Body** (FormData):
- `file` (required): Image file
- `title` (optional): Image title
- `alt` (optional): Alt text for SEO
- `caption` (optional): Image caption

**Example**:
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('title', 'My Image');
formData.append('alt', 'Description for SEO');

const res = await fetch('/api/wordpress/media', {
  method: 'POST',
  body: formData,
});
const data = await res.json();
// { id: 123, title: 'My Image', source_url: '...' }
```

## 🐛 Troubleshooting

### Issue 1: "Failed to fetch media"

**Possible causes**:
- WordPress URL is incorrect
- API credentials are wrong
- WordPress API endpoint doesn't exist
- CORS issues

**Solution**:
1. Check your `.env.local` file
2. Verify `WP_BASE` URL is correct (no trailing slash)
3. Test WordPress API directly:
   ```bash
   curl -H "X-Api-Key: dtps_live_7JpQ6QfE2w3r9T1L" \
        -H "X-Api-Secret: dtps_secret_bS8mN2kL5xP0vY4R" \
        https://your-wordpress-site.com/wp-json/dtps/v1/media
   ```

### Issue 2: "Upload failed"

**Possible causes**:
- File too large
- Invalid file type
- WordPress upload permissions
- API credentials invalid

**Solution**:
1. Check browser console for errors
2. Check server logs: `npm run dev` output
3. Verify file is an image (JPG, PNG, GIF, WebP)
4. Check WordPress upload limits in `php.ini`:
   ```ini
   upload_max_filesize = 10M
   post_max_size = 10M
   ```

### Issue 3: Images not displaying

**Possible causes**:
- CORS issues
- Invalid image URLs
- WordPress media not publicly accessible

**Solution**:
1. Check image URL in browser
2. Verify WordPress media is publicly accessible
3. Add WordPress domain to Next.js config if using `next/image`:
   ```javascript
   // next.config.js
   module.exports = {
     images: {
       domains: ['your-wordpress-site.com'],
     },
   };
   ```

## 🔐 Security Notes

1. **Never commit `.env.local`** - It contains sensitive credentials
2. **Use environment variables** - Don't hardcode API keys
3. **Validate file types** - Only allow images
4. **Limit file sizes** - Prevent abuse
5. **Use HTTPS** - Always use secure connections to WordPress

## 🎨 Customization

### Change Upload Limits

In `src/app/api/wordpress/media/route.ts`:

```typescript
// Add file size validation
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

if (file.size > MAX_FILE_SIZE) {
  return NextResponse.json(
    { error: 'File too large. Max 5MB.' },
    { status: 400 }
  );
}
```

### Add More File Types

```typescript
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

if (!ALLOWED_TYPES.includes(file.type)) {
  return NextResponse.json(
    { error: 'Invalid file type. Only images allowed.' },
    { status: 400 }
  );
}
```

### Customize Gallery Layout

In the page component, modify the grid:

```typescript
<div
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', // Larger cards
    gap: 24, // More spacing
  }}
>
```

## 📊 WordPress API Response Format

```typescript
{
  id: 123,
  title: "My Image",
  alt_text: "Description for SEO",
  caption: "Image caption",
  mime_type: "image/jpeg",
  source_url: "https://wordpress.com/wp-content/uploads/2024/01/image.jpg",
  date: "2024-01-15T10:30:00",
  sizes: {
    thumbnail: {
      url: "...",
      width: 150,
      height: 150,
      mime: "image/jpeg"
    },
    medium: { ... },
    large: { ... }
  }
}
```

## 🚀 Production Deployment

1. **Set environment variables** in your hosting platform (Vercel, Netlify, etc.)
2. **Build the application**:
   ```bash
   npm run build
   ```
3. **Test the production build**:
   ```bash
   npm start
   ```
4. **Deploy** to your hosting platform

## 📝 Next Steps

1. ✅ Set up environment variables
2. ✅ Test upload functionality
3. ✅ Test fetch functionality
4. ✅ Customize styling
5. ✅ Add error handling
6. ✅ Deploy to production

## 🆘 Support

If you encounter issues:

1. Check browser console for errors
2. Check server logs (`npm run dev` output)
3. Verify WordPress API is accessible
4. Test API credentials with curl/Postman
5. Check WordPress error logs

## 📚 Additional Resources

- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [WordPress REST API](https://developer.wordpress.org/rest-api/)
- [FormData API](https://developer.mozilla.org/en-US/docs/Web/API/FormData)

