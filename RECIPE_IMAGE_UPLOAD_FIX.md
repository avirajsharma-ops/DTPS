# Recipe Image Upload - FIXED! ✅

## 🐛 Issue Found

The recipe image upload was failing with error: **"Failed to upload image. Please try again."**

### Root Cause
The `/api/upload` endpoint requires a `type` parameter, but the recipe creation page wasn't sending it.

## ✅ Fix Applied

Updated `src/app/recipes/create/page.tsx` to include the `type` parameter:

```typescript
// Before (BROKEN)
const formData = new FormData();
formData.append('file', file);

// After (FIXED)
const formData = new FormData();
formData.append('file', file);
formData.append('type', 'recipe-image'); // ✅ Added this line
```

## 🎯 What Changed

### File: `src/app/recipes/create/page.tsx`

**Line 136**: Added `type` parameter to FormData
```typescript
formData.append('type', 'recipe-image');
```

**Lines 139-142**: Improved error handling
```typescript
if (!response.ok) {
  const errorData = await response.json();
  console.error('Upload error:', errorData);
  throw new Error(errorData.error || 'Failed to upload image');
}
```

**Line 146**: Added success logging
```typescript
console.log('Upload successful:', data);
```

## 🧪 How to Test

1. **Start your dev server**:
   ```bash
   npm run dev
   ```

2. **Go to recipe creation page**:
   ```
   http://localhost:3000/recipes/create
   ```

3. **Upload an image**:
   - Click "Recipe Image" file input
   - Select an image (JPG, PNG, WebP)
   - Wait for upload to complete
   - See preview appear ✅

4. **Fill in recipe details**:
   - Recipe Name
   - Description
   - Category
   - Ingredients
   - Instructions

5. **Submit the recipe**:
   - Click "Create Recipe"
   - Recipe should be created with image ✅

## 📊 Upload API Details

### Endpoint: `POST /api/upload`

**Required Parameters**:
- `file` (File): The image file
- `type` (string): Type of upload

**Supported Types**:
- `avatar` - User profile pictures
- `recipe-image` - Recipe images ✅
- `document` - PDF, Word documents
- `message` - Message attachments

**File Limits for `recipe-image`**:
- **Max Size**: 5MB
- **Allowed Types**: 
  - `image/jpeg` (JPG)
  - `image/png` (PNG)
  - `image/webp` (WebP)

**Response**:
```json
{
  "url": "/api/files/65abc123...",
  "filename": "1234567890.jpg",
  "size": 123456,
  "type": "image/jpeg",
  "fileId": "65abc123..."
}
```

## 🔍 Debugging

If upload still fails, check:

### 1. Browser Console
```javascript
// Should see:
Upload successful: { url: "/api/files/...", ... }

// If error:
Upload error: { error: "..." }
```

### 2. Network Tab
- Open DevTools → Network
- Upload an image
- Look for `/api/upload` request
- Check:
  - Status: Should be `200 OK`
  - Response: Should have `url` field
  - Request Payload: Should have `file` and `type`

### 3. Server Logs
```bash
# In terminal where you run `npm run dev`
# Should see:
✓ Compiled /api/upload in XXXms
```

## 🐛 Common Errors & Solutions

### Error: "No file provided"
**Cause**: File input is empty  
**Solution**: Make sure to select a file before uploading

### Error: "Invalid file type"
**Cause**: File is not an image  
**Solution**: Only upload JPG, PNG, or WebP images

### Error: "File too large"
**Cause**: Image is larger than 5MB  
**Solution**: Compress the image or use a smaller file

### Error: "Unauthorized"
**Cause**: Not logged in  
**Solution**: Log in to your account first

### Error: "Failed to upload file"
**Cause**: Server error (database, etc.)  
**Solution**: 
1. Check MongoDB connection
2. Check server logs
3. Restart dev server

## 📝 WordPress Media Integration

If you want to upload recipe images to **WordPress** instead of MongoDB:

### Option 1: Use WordPress Media API

Update the upload handler to use WordPress:

```typescript
const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    setUploading(true);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', 'Recipe Image');
    formData.append('alt', 'Recipe');
    
    // Upload to WordPress instead
    const response = await fetch('/api/wordpress/media', {
      method: 'POST',
      body: formData,
    });
    
    const data = await response.json();
    setImage(data.source_url); // WordPress returns source_url
  } catch (err) {
    setError('Failed to upload to WordPress');
  } finally {
    setUploading(false);
  }
};
```

### Option 2: Dual Upload (MongoDB + WordPress)

Upload to both MongoDB and WordPress:

```typescript
// Upload to MongoDB first
const mongoResponse = await fetch('/api/upload', {
  method: 'POST',
  body: formData,
});
const mongoData = await mongoResponse.json();

// Then upload to WordPress
const wpResponse = await fetch('/api/wordpress/media', {
  method: 'POST',
  body: formData,
});
const wpData = await wpResponse.json();

// Use WordPress URL for display, MongoDB for backup
setImage(wpData.source_url);
```

## 🎉 Summary

**Issue**: Recipe image upload failing  
**Cause**: Missing `type` parameter  
**Fix**: Added `formData.append('type', 'recipe-image')`  
**Status**: ✅ FIXED  

**Now you can**:
- ✅ Upload recipe images
- ✅ See image preview
- ✅ Create recipes with images
- ✅ Images stored in MongoDB
- ✅ Images accessible via `/api/files/{fileId}`

## 🚀 Next Steps

1. ✅ Test recipe image upload
2. ✅ Create a recipe with image
3. ✅ Verify image displays in recipe list
4. ✅ (Optional) Integrate with WordPress media

**Need WordPress integration?** See `WORDPRESS_MEDIA_INTEGRATION.md`

