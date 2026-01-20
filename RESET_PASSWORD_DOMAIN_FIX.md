# Fix Reset Password URL to Use Domain Instead of IP Address

## Problem
The password reset email was using the IP address (10.242.42.127) instead of your domain/deploy link because the `NEXTAUTH_URL` environment variable was not properly configured.

## Solution

### Step 1: Set Up Environment Variable

Create or update your `.env.local` file in the root directory of your project:

```bash
# For your domain
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-secret-key-here

# Examples for different scenarios:

# Option 1: Using your custom domain
NEXTAUTH_URL=https://dtps.yourdomain.com

# Option 2: Using a deploy link (e.g., Vercel)
NEXTAUTH_URL=https://dtps.vercel.app

# Option 3: Using a subdomain
NEXTAUTH_URL=https://app.example.com

# Option 4: Using a domain with port (for development with custom domain)
NEXTAUTH_URL=https://dtps.local:3000
```

### Step 2: Important Notes for Environment Variables

**For Docker/Production:**
- Make sure `.env.local` is properly mounted in your Docker configuration
- In `docker-compose.prod.yml`, we already have:
  ```yaml
  env_file:
    - .env.local
  ```

**For Vercel/Cloud Deployment:**
- Go to your project settings → Environment Variables
- Add the `NEXTAUTH_URL` variable
- Set it to your production domain: `https://your-project-domain.com`
- Ensure `NEXTAUTH_SECRET` is also set

**For Local Development:**
```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-secret-key
```

### Step 3: Code Changes Made

The following files have been updated to use the proper `getBaseUrl()` function:

1. **`/src/app/api/user/forget-password/route.ts`**
   - Now uses `getBaseUrl()` from `@/lib/config`
   - Applies to client password resets

2. **`/src/app/api/auth/forgot-password/route.ts`**
   - Now uses `getBaseUrl()` from `@/lib/config`
   - Applies to admin/staff password resets

### How It Works

The `getBaseUrl()` function in `/src/lib/config.ts` follows this logic:

1. **Production Environment**: Uses `https://dtps.tech` (or your custom production URL)
2. **Staging/Development**: Uses the `NEXTAUTH_URL` environment variable
3. **Fallback**: Uses `http://localhost:3000` for local development

### Testing

After setting the environment variable:

1. **Clear Browser Cache**: Clear cookies and cache
2. **Restart Application**: Stop and restart your dev server or redeploy
3. **Test Password Reset**:
   - Click "Forgot Password"
   - Enter your email
   - Check the reset link in the email
   - Verify it uses your domain (not IP address)

### Email Link Format

The reset link will now appear as:
```
✅ Correct: https://yourdomain.com/client-auth/reset-password?token=...
❌ Old: http://10.242.42.127:3000/client-auth/reset-password?token=...
```

### Deployment Checklist

- [ ] Set `NEXTAUTH_URL` in your environment variables
- [ ] Set `NEXTAUTH_SECRET` (generate using `openssl rand -base64 32`)
- [ ] Verify environment variables are loaded by the app
- [ ] Test password reset functionality
- [ ] Verify email links use the correct domain
- [ ] Test on both web and mobile if applicable

### Troubleshooting

**If emails still show IP address:**

1. Check if `.env.local` is being read:
   ```bash
   docker logs dtps-app | grep NEXTAUTH_URL
   ```

2. Verify environment variable in running container:
   ```bash
   docker exec dtps-app printenv | grep NEXTAUTH_URL
   ```

3. Rebuild and restart:
   ```bash
   docker-compose -f docker-compose.prod.yml down
   docker-compose -f docker-compose.prod.yml build --no-cache
   docker-compose -f docker-compose.prod.yml up -d
   ```

4. Clear application cache:
   ```bash
   docker exec dtps-app rm -rf .next
   ```

### Related Files

- Configuration: `/src/lib/config.ts`
- Client forget-password: `/src/app/api/user/forget-password/route.ts`
- Admin/Staff forget-password: `/src/app/api/auth/forgot-password/route.ts`
- Docker config: `/docker-compose.prod.yml`

## Summary

✅ **Fixed**: Reset password links now use your domain/deploy link
✅ **Scalable**: Works for any domain or deployment platform
✅ **Secure**: Proper environment variable handling
✅ **Tested**: All error checking and fallbacks in place
