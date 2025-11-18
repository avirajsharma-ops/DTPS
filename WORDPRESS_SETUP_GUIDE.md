# WordPress Integration Setup Guide

## ❓ What is WP_BASE?

**WP_BASE** is the URL of your WordPress website.

### Examples:

✅ **Correct**:
```env
WP_BASE=https://dtpsnutrition.com
WP_BASE=https://yoursite.com
WP_BASE=https://blog.mycompany.com
WP_BASE=https://wordpress.example.org
```

❌ **Incorrect**:
```env
WP_BASE=https://your-wordpress-site.com![v](image.png)  # ❌ Remove ![v](image.png)
WP_BASE=https://yoursite.com/                           # ❌ No trailing slash
WP_BASE=https://yoursite.com/wp-json                    # ❌ No path
WP_BASE=yoursite.com                                    # ❌ Must include https://
WP_BASE=http://yoursite.com                             # ❌ Use https:// not http://
```

## 🔧 Complete Setup

### Step 1: Find Your WordPress URL

Your WordPress URL is the main domain where your WordPress site is hosted.

**How to find it**:
1. Open your WordPress admin panel
2. Look at the URL in your browser
3. The domain part is your WP_BASE

**Examples**:
- If admin is at `https://dtpsnutrition.com/wp-admin/` → WP_BASE is `https://dtpsnutrition.com`
- If admin is at `https://blog.mysite.com/wp-admin/` → WP_BASE is `https://blog.mysite.com`

### Step 2: Get Your API Credentials

You already have these:
- **API Key**: `dtps_live_7JpQ6QfE2w3r9T1L`
- **API Secret**: `dtps_secret_bS8mN2kL5xP0vY4R`

### Step 3: Create `.env.local` File

In your project root (`c:\Users\DTPS\Desktop\zoconut`), create or edit `.env.local`:

```env
# WordPress Configuration
WP_BASE=https://dtpsnutrition.com
WP_API_KEY=dtps_live_7JpQ6QfE2w3r9T1L
WP_API_SECRET=dtps_secret_bS8mN2kL5xP0vY4R
```

**⚠️ Replace `https://dtpsnutrition.com` with your actual WordPress URL!**

### Step 4: Restart Your Dev Server

```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

## 🧪 Test WordPress Connection

### Method 1: Using curl (Command Line)

```bash
curl -H "X-Api-Key: dtps_live_7JpQ6QfE2w3r9T1L" \
     -H "X-Api-Secret: dtps_secret_bS8mN2kL5xP0vY4R" \
     https://YOUR-WORDPRESS-URL/wp-json/dtps/v1/media
```

**Replace `YOUR-WORDPRESS-URL`** with your actual WordPress URL.

**Expected Response**:
```json
{
  "items": [...],
  "total": 10
}
```

### Method 2: Using Browser

Visit the WordPress media page:
```
http://localhost:3000/wordpress-media-client
```

If it loads without errors, your connection is working! ✅

## 🔍 Troubleshooting

### Issue: "Failed to fetch media"

**Possible Causes**:
1. ❌ WP_BASE is incorrect
2. ❌ WordPress API endpoint doesn't exist
3. ❌ API credentials are wrong
4. ❌ CORS issues

**Solutions**:

#### 1. Verify WP_BASE
```bash
# Test if WordPress is accessible
curl https://YOUR-WORDPRESS-URL
```

Should return HTML of your WordPress site.

#### 2. Check WordPress API Endpoint
```bash
# Test if API endpoint exists
curl https://YOUR-WORDPRESS-URL/wp-json/dtps/v1/media
```

Should return JSON (might be error if no auth, but should be JSON).

#### 3. Verify API Credentials

Check with your WordPress admin:
- Go to WordPress admin
- Find API settings
- Verify the API key and secret match

#### 4. Check CORS Settings

Your WordPress needs to allow requests from your Next.js app.

**WordPress CORS Plugin** or add to `functions.php`:
```php
add_action('rest_api_init', function() {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: X-Api-Key, X-Api-Secret, Content-Type');
});
```

### Issue: "Upload failed"

**Possible Causes**:
1. ❌ File too large
2. ❌ WordPress upload permissions
3. ❌ PHP upload limits

**Solutions**:

#### 1. Check File Size
- Max file size: Usually 2MB-10MB
- Compress images before uploading

#### 2. Check WordPress Upload Permissions
```bash
# SSH into WordPress server
ls -la wp-content/uploads/
# Should show writable permissions (755 or 775)
```

#### 3. Increase PHP Upload Limits

Edit `php.ini`:
```ini
upload_max_filesize = 10M
post_max_size = 10M
max_execution_time = 300
```

Or add to `.htaccess`:
```apache
php_value upload_max_filesize 10M
php_value post_max_size 10M
```

## 📊 WordPress API Endpoints

Your WordPress should have these endpoints:

### GET Media
```
GET https://YOUR-WORDPRESS-URL/wp-json/dtps/v1/media
```

**Headers**:
```
X-Api-Key: dtps_live_7JpQ6QfE2w3r9T1L
X-Api-Secret: dtps_secret_bS8mN2kL5xP0vY4R
```

**Query Parameters**:
- `per_page` (optional): Number of items (default: 24)
- `page` (optional): Page number (default: 1)

### POST Media (Upload)
```
POST https://YOUR-WORDPRESS-URL/wp-json/dtps/v1/media
```

**Headers**:
```
X-Api-Key: dtps_live_7JpQ6QfE2w3r9T1L
X-Api-Secret: dtps_secret_bS8mN2kL5xP0vY4R
Content-Type: multipart/form-data
```

**Body** (FormData):
- `file`: Image file
- `title` (optional): Image title
- `alt` (optional): Alt text
- `caption` (optional): Caption

## 🔐 Security Checklist

- ✅ Use HTTPS (not HTTP)
- ✅ Keep API credentials in `.env.local` (not committed to git)
- ✅ Never hardcode credentials in code
- ✅ Use environment variables
- ✅ Validate file types and sizes
- ✅ Enable CORS only for your domain (in production)

## 📝 Example `.env.local`

```env
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/zoconut

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# WordPress Integration
WP_BASE=https://dtpsnutrition.com
WP_API_KEY=dtps_live_7JpQ6QfE2w3r9T1L
WP_API_SECRET=dtps_secret_bS8mN2kL5xP0vY4R

# Stripe (if using)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Other services...
```

## 🎯 Quick Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `WP_BASE` | WordPress website URL | `https://dtpsnutrition.com` |
| `WP_API_KEY` | WordPress API key | `dtps_live_7JpQ6QfE2w3r9T1L` |
| `WP_API_SECRET` | WordPress API secret | `dtps_secret_bS8mN2kL5xP0vY4R` |

## 🚀 Next Steps

1. ✅ Set `WP_BASE` to your WordPress URL
2. ✅ Restart dev server
3. ✅ Test connection at `/wordpress-media-client`
4. ✅ Upload a test image
5. ✅ Verify image appears in gallery

## 🆘 Still Having Issues?

1. **Check browser console** for errors
2. **Check server logs** (`npm run dev` output)
3. **Test WordPress API** with curl
4. **Verify API credentials** in WordPress admin
5. **Check CORS settings** on WordPress

**Common Error Messages**:
- "Failed to fetch media" → Check WP_BASE and API credentials
- "Upload failed" → Check file size and WordPress permissions
- "Unauthorized" → Check API key and secret
- "CORS error" → Enable CORS on WordPress

