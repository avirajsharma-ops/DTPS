# WordPress Upload Fix - Recipe Images

## 🔍 Problem Identified

The recipe creation page is trying to upload images to WordPress, but getting a **405 Method Not Allowed** error.

### Error Details:
```
Uploading to WordPress: {
  filename: 'WhatsApp Image 2025-10-09 at 15.02.37.jpeg',
  type: 'image/jpeg',
  size: 47639,
  title: 'Recipe Image',
  alt: 'Recipe image',
  caption: null
}
WordPress upload error: Method Not Allowed
POST /api/wordpress/media 405 in 1866ms
```

## 🎯 Root Cause

The WordPress API endpoint `https://dtps.app/wp-json/dtps/v1/media` is returning 405, which means:

1. **WordPress Plugin Not Installed**: The custom DTPS API plugin might not be installed on your WordPress site
2. **Endpoint Not Configured**: The `/media` endpoint might not support POST requests
3. **Server Configuration**: WordPress might be blocking the request

## ✅ What I Fixed

### 1. Added WordPress Environment Variables

Added to `.env.local`:
```env
WP_BASE=https://dtps.app
WP_API_KEY=dtps_live_7JpQ6QfE2w3r9T1L
WP_API_SECRET=dtps_secret_bS8mN2kL5xP0vY4R
```

### 2. Updated Recipe Image Upload

Modified `src/app/recipes/create/page.tsx` to use `data.source_url` from WordPress response:

```typescript
// Use the WordPress media URL (source_url is the full URL from WordPress)
setImage(data.source_url || data.url);
```

### 3. Created WordPress API Test Page

Created `src/app/test-wordpress/page.tsx` to test the WordPress API directly.

**Access it at:** http://localhost:3000/test-wordpress

## 🧪 Testing the WordPress API

Visit http://localhost:3000/test-wordpress and click the buttons to test:

1. **Test GET Media (Direct)** - Tests if you can fetch media from WordPress
2. **Test POST Media (Direct)** - Tests if you can upload to WordPress
3. **Test via Next.js API** - Tests the Next.js API route

## 🔧 WordPress Plugin Requirements

Your WordPress site needs a custom plugin that provides the DTPS API endpoints:

### Required Endpoint: POST /wp-json/dtps/v1/media

**Headers:**
- `X-Api-Key: dtps_live_7JpQ6QfE2w3r9T1L`
- `X-Api-Secret: dtps_secret_bS8mN2kL5xP0vY4R`

**Body:**
- `file` (multipart/form-data) - The image file
- `title` (optional) - Image title
- `alt` (optional) - Alt text
- `caption` (optional) - Caption

**Response:**
```json
{
  "id": 123,
  "title": "Recipe Image",
  "alt_text": "Recipe image",
  "caption": null,
  "mime_type": "image/jpeg",
  "source_url": "https://dtps.app/wp-content/uploads/2025/10/image.jpg",
  "date": "2025-10-11T10:30:00",
  "sizes": {
    "thumbnail": {
      "url": "https://dtps.app/wp-content/uploads/2025/10/image-150x150.jpg",
      "width": 150,
      "height": 150
    }
  }
}
```

## 📝 WordPress Plugin Code (PHP)

If the plugin doesn't exist, here's the code you need to add to WordPress:

```php
<?php
/**
 * Plugin Name: DTPS API
 * Description: Custom REST API endpoints for DTPS
 * Version: 1.0.0
 */

// Register REST API routes
add_action('rest_api_init', function () {
    // Media upload endpoint
    register_rest_route('dtps/v1', '/media', array(
        'methods' => 'POST',
        'callback' => 'dtps_upload_media',
        'permission_callback' => 'dtps_verify_api_keys',
    ));

    // Media list endpoint
    register_rest_route('dtps/v1', '/media', array(
        'methods' => 'GET',
        'callback' => 'dtps_get_media',
        'permission_callback' => 'dtps_verify_api_keys',
    ));
});

// Verify API keys
function dtps_verify_api_keys($request) {
    $api_key = $request->get_header('X-Api-Key');
    $api_secret = $request->get_header('X-Api-Secret');
    
    $valid_key = 'dtps_live_7JpQ6QfE2w3r9T1L';
    $valid_secret = 'dtps_secret_bS8mN2kL5xP0vY4R';
    
    return ($api_key === $valid_key && $api_secret === $valid_secret);
}

// Upload media
function dtps_upload_media($request) {
    require_once(ABSPATH . 'wp-admin/includes/file.php');
    require_once(ABSPATH . 'wp-admin/includes/media.php');
    require_once(ABSPATH . 'wp-admin/includes/image.php');

    $files = $request->get_file_params();
    
    if (empty($files['file'])) {
        return new WP_Error('no_file', 'No file provided', array('status' => 400));
    }

    $file = $files['file'];
    
    // Upload file
    $upload = wp_handle_upload($file, array('test_form' => false));
    
    if (isset($upload['error'])) {
        return new WP_Error('upload_error', $upload['error'], array('status' => 500));
    }

    // Create attachment
    $attachment = array(
        'post_mime_type' => $upload['type'],
        'post_title' => $request->get_param('title') ?: sanitize_file_name($file['name']),
        'post_content' => '',
        'post_status' => 'inherit'
    );

    $attach_id = wp_insert_attachment($attachment, $upload['file']);
    
    if (is_wp_error($attach_id)) {
        return $attach_id;
    }

    // Generate metadata
    $attach_data = wp_generate_attachment_metadata($attach_id, $upload['file']);
    wp_update_attachment_metadata($attach_id, $attach_data);

    // Update alt text
    if ($request->get_param('alt')) {
        update_post_meta($attach_id, '_wp_attachment_image_alt', $request->get_param('alt'));
    }

    // Get attachment data
    $attachment_url = wp_get_attachment_url($attach_id);
    $attachment_meta = wp_get_attachment_metadata($attach_id);
    
    return array(
        'id' => $attach_id,
        'title' => get_the_title($attach_id),
        'alt_text' => get_post_meta($attach_id, '_wp_attachment_image_alt', true),
        'caption' => wp_get_attachment_caption($attach_id),
        'mime_type' => get_post_mime_type($attach_id),
        'source_url' => $attachment_url,
        'date' => get_the_date('c', $attach_id),
        'sizes' => isset($attachment_meta['sizes']) ? $attachment_meta['sizes'] : array(),
    );
}

// Get media list
function dtps_get_media($request) {
    $per_page = $request->get_param('per_page') ?: 24;
    $page = $request->get_param('page') ?: 1;
    
    $args = array(
        'post_type' => 'attachment',
        'post_status' => 'inherit',
        'posts_per_page' => $per_page,
        'paged' => $page,
        'post_mime_type' => 'image',
    );
    
    $query = new WP_Query($args);
    $items = array();
    
    foreach ($query->posts as $post) {
        $attachment_meta = wp_get_attachment_metadata($post->ID);
        
        $items[] = array(
            'id' => $post->ID,
            'title' => $post->post_title,
            'alt_text' => get_post_meta($post->ID, '_wp_attachment_image_alt', true),
            'caption' => $post->post_excerpt,
            'mime_type' => $post->post_mime_type,
            'source_url' => wp_get_attachment_url($post->ID),
            'date' => $post->post_date,
            'sizes' => isset($attachment_meta['sizes']) ? $attachment_meta['sizes'] : array(),
        );
    }
    
    return array(
        'items' => $items,
        'total' => $query->found_posts,
    );
}
```

## 🚀 Next Steps

1. **Test the WordPress API** using the test page at http://localhost:3000/test-wordpress
2. **If 405 error persists:**
   - Install the WordPress plugin code above
   - Or contact your WordPress administrator
   - Or check if the WordPress site is accessible
3. **Once WordPress API works:**
   - Recipe images will upload to WordPress
   - Images will be stored at `https://dtps.app/wp-content/uploads/...`
   - Recipe creation will work with proper image URLs

## 📊 Current Flow

```
User uploads image in recipe form
    ↓
Next.js client sends to /api/wordpress/media
    ↓
Next.js API route forwards to WordPress
    ↓
WordPress API (https://dtps.app/wp-json/dtps/v1/media)
    ↓
❌ Returns 405 Method Not Allowed (PLUGIN MISSING)
```

## ✅ Expected Flow (After Fix)

```
User uploads image in recipe form
    ↓
Next.js client sends to /api/wordpress/media
    ↓
Next.js API route forwards to WordPress
    ↓
WordPress API (https://dtps.app/wp-json/dtps/v1/media)
    ↓
✅ Uploads image to WordPress
    ↓
Returns { source_url: "https://dtps.app/wp-content/uploads/..." }
    ↓
Recipe saved with WordPress image URL
```

## 🔗 Related Files

- `src/app/recipes/create/page.tsx` - Recipe creation form
- `src/app/api/wordpress/media/route.ts` - Next.js API route
- `src/app/test-wordpress/page.tsx` - WordPress API test page
- `.env.local` - Environment variables

## 📞 Support

If you need help installing the WordPress plugin, please provide:
1. WordPress admin access
2. FTP/cPanel access
3. Or share the test results from http://localhost:3000/test-wordpress

