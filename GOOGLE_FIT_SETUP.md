# Google Fit API Setup Guide for DTPS Watch Integration

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it "DTPS Watch Integration" and click "Create"
4. Wait for project creation, then select it

## Step 2: Enable Fitness API

1. Go to **APIs & Services** → **Library**
2. Search for "Fitness API"
3. Click on "Fitness API" 
4. Click **Enable**

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** (for testing) → Click "Create"
3. Fill in the form:
   - **App name**: DTPS Nutrition
   - **User support email**: Your email
   - **Developer contact email**: Your email
4. Click "Save and Continue"

### Add Scopes
1. Click "Add or Remove Scopes"
2. Search and add these scopes:
   - `https://www.googleapis.com/auth/fitness.activity.read`
   - `https://www.googleapis.com/auth/fitness.heart_rate.read`
   - `https://www.googleapis.com/auth/fitness.sleep.read`
   - `https://www.googleapis.com/auth/fitness.body.read`
3. Click "Update" then "Save and Continue"

### Add Test Users
1. Click "Add Users"
2. Add your Gmail addresses that will test the app
3. Click "Save and Continue"

## Step 4: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **OAuth client ID**
3. Select **Web application**
4. Name it: "DTPS Web Client"

### Add Authorized JavaScript Origins:
```
http://localhost:3000
https://dtps.tech
```

### Add Authorized Redirect URIs:
```
http://localhost:3000/api/watch/oauth/callback
https://dtps.tech/api/watch/oauth/callback
http://localhost:3000/api/auth/google-calendar/callback
https://dtps.tech/api/auth/google-calendar/callback
```

5. Click **Create**
6. **Copy the Client ID and Client Secret** - you'll need these!

## Step 5: Update .env File

Add these to your `.env` file:

```env
# Google Fit / Calendar OAuth
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here

# Base URL (use localhost for development)
NEXTAUTH_URL=http://localhost:3000
```

## Step 6: Test the Connection

1. Start your app: `npm run dev`
2. Go to `http://localhost:3000/user/watch`
3. Click "Connect" on Google Fit
4. You should see Google's consent screen
5. After approval, you'll be redirected back with data synced

## Troubleshooting

### Error: redirect_uri_mismatch
- Make sure the redirect URI in Google Console EXACTLY matches
- Use `http://localhost:3000` not your IP address
- Wait 5 minutes after adding new URIs

### Error: Access blocked
- Add your email to "Test users" in OAuth consent screen
- Make sure Fitness API is enabled

### Error: invalid_client
- Double-check Client ID and Client Secret in .env
- Make sure there are no extra spaces

## How Data Flows

```
User clicks "Connect Google Fit"
        ↓
POST /api/watch/oauth/callback (returns OAuth URL)
        ↓
User redirected to Google Sign-in
        ↓
User grants permissions
        ↓
Google redirects to /api/watch/oauth/callback?code=xxx
        ↓
Server exchanges code for tokens
        ↓
Tokens stored in database
        ↓
User redirected to /user/watch?success=connected
        ↓
Auto-sync fetches health data from Google Fit
```

## Available Health Data

Once connected, you can sync:
- **Steps**: Daily step count
- **Heart Rate**: BPM readings
- **Sleep**: Sleep duration and quality
- **Calories**: Calories burned
- **Weight**: Body weight (if tracked)
