// API Route: Watch OAuth Callback
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db/connection';
import { WatchService, WATCH_PROVIDER_CONFIGS } from '@/watchconnectivity/backend/services/WatchService';

// GET /api/watch/oauth/callback - Handle OAuth callback
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    
    console.log('Watch OAuth callback received:', { code: code?.substring(0, 20) + '...', state, error });
    
    if (error) {
      console.error('OAuth error from provider:', error);
      return NextResponse.redirect(
        new URL(`/user/watch?error=${encodeURIComponent(error)}`, req.url)
      );
    }
    
    if (!code || !state) {
      console.error('Missing code or state');
      return NextResponse.redirect(
        new URL('/user/watch?error=invalid_callback', req.url)
      );
    }
    
    // Parse state (format: userId:provider)
    const [userId, watchProvider] = state.split(':');
    
    if (!userId || !watchProvider) {
      console.error('Invalid state format:', state);
      return NextResponse.redirect(
        new URL('/user/watch?error=invalid_state', req.url)
      );
    }
    
    console.log('Connecting to DB...');
    await connectDB();
    console.log('DB connected');
    
    // Get the actual redirect URI from the request (to match exactly)
    const actualRedirectUri = `${req.nextUrl.origin}/api/watch/oauth/callback`;
    console.log('Using redirect URI:', actualRedirectUri);
    
    // Exchange code for tokens based on provider
    let watchTokens = null;
    
    try {
      console.log('Exchanging code for tokens...');
      if (watchProvider === 'google_fit') {
        watchTokens = await exchangeWatchGoogleFitCode(code, actualRedirectUri);
      } else if (watchProvider === 'fitbit') {
        watchTokens = await exchangeWatchFitbitCode(code, actualRedirectUri);
      }
      console.log('Token exchange successful');
    } catch (tokenError) {
      console.error('Watch token exchange error:', tokenError);
      return NextResponse.redirect(
        new URL('/user/watch?error=token_exchange_failed', req.url)
      );
    }
    
    // Connect the watch with tokens
    console.log('Saving watch connection...');
    await WatchService.connectWatch(userId, watchProvider, watchTokens || undefined);
    console.log('Watch connected successfully');
    
    return NextResponse.redirect(
      new URL('/user/watch?success=connected', req.url)
    );
  } catch (error) {
    console.error('Watch OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/user/watch?error=callback_failed', req.url)
    );
  }
}

// Exchange Google Fit authorization code for tokens
async function exchangeWatchGoogleFitCode(code: string, redirectUri: string) {
  const config = WATCH_PROVIDER_CONFIGS.google_fit;
  
  console.log('Exchanging Google Fit code with redirect_uri:', redirectUri);
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google token exchange failed:', response.status, errorText);
    throw new Error(`Failed to exchange Google Fit code: ${errorText}`);
  }
  
  const data = await response.json();
  console.log('Google token received successfully');
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiry: new Date(Date.now() + data.expires_in * 1000),
  };
}

// Exchange Fitbit authorization code for tokens
async function exchangeWatchFitbitCode(code: string, redirectUri: string) {
  const config = WATCH_PROVIDER_CONFIGS.fitbit;
  
  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  
  const response = await fetch('https://api.fitbit.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to exchange Fitbit code');
  }
  
  const data = await response.json();
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiry: new Date(Date.now() + data.expires_in * 1000),
  };
}

// POST /api/watch/oauth/callback - Get OAuth URL
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { watchProvider } = await req.json();
    
    if (!watchProvider) {
      return NextResponse.json(
        { success: false, error: 'Watch provider is required' },
        { status: 400 }
      );
    }
    
    if (watchProvider === 'apple_watch') {
      return NextResponse.json({
        success: true,
        message: 'Apple Watch uses HealthKit - please use the iOS app',
        watchOAuthUrl: null,
        watchRequiresApp: true,
      });
    }
    
    // NoiseFit doesn't have public API - use manual entry or sync via Google Fit
    if (watchProvider === 'noisefit') {
      return NextResponse.json({
        success: true,
        message: 'NoiseFit watches use manual entry. You can also sync your NoiseFit data to Google Fit app and connect via Google Fit.',
        watchOAuthUrl: null,
        watchRequiresManual: true,
        watchSyncTip: 'Open NoiseFit app → Settings → Sync to Google Fit',
      });
    }
    
    // Samsung and Garmin also require manual or app-based setup
    if (['samsung', 'garmin', 'other'].includes(watchProvider)) {
      return NextResponse.json({
        success: true,
        message: 'This watch type uses manual data entry',
        watchOAuthUrl: null,
        watchRequiresManual: true,
      });
    }
    
    // Get the actual origin from request for OAuth redirect
    const origin = req.nextUrl.origin;
    const redirectUri = `${origin}/api/watch/oauth/callback`;
    
    const state = `${session.user.id}:${watchProvider}`;
    const watchOAuthUrl = WatchService.getWatchOAuthUrl(watchProvider, state, redirectUri);
    
    return NextResponse.json({
      success: true,
      watchOAuthUrl,
      watchRequiresApp: false,
    });
  } catch (error) {
    console.error('Watch OAuth URL error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate OAuth URL' },
      { status: 500 }
    );
  }
}
