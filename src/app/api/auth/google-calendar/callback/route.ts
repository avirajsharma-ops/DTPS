import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import { google } from 'googleapis';

/**
 * Google Calendar OAuth Callback Handler
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    // Handle user denial of permissions
    if (error) {
      console.log('User denied Google Calendar permissions:', error);
      let baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      baseUrl = baseUrl.replace(/\/$/, '');
      return NextResponse.redirect(
        new URL('/settings?calendar=denied', baseUrl)
      );
    }

    if (!code) {
      let baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      baseUrl = baseUrl.replace(/\/$/, '');
      return NextResponse.redirect(
        new URL('/settings?calendar=error&message=no-code', baseUrl)
      );
    }

    // Get the stored session to authenticate the user
    const session = await getServerSession(authOptions);
    if (!session) {
      let baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      baseUrl = baseUrl.replace(/\/$/, '');
      return NextResponse.redirect(
        new URL('/auth/signin?error=session-expired', baseUrl)
      );
    }

    // Get base URL without trailing slash
    let baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    baseUrl = baseUrl.replace(/\/$/, '');
    
    const redirectUri = `${baseUrl}/api/auth/google-calendar/callback`;

    // Initialize OAuth client with correct redirect URI
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      return NextResponse.redirect(
        new URL('/settings?calendar=error&message=no-token', baseUrl)
      );
    }

    // Save tokens to database
    await connectDB();
    const user = await User.findById(session.user.id);
    
    if (!user) {
      return NextResponse.redirect(
        new URL('/settings?calendar=error&message=user-not-found', baseUrl)
      );
    }

    // Store the tokens with proper error handling
    try {
      user.googleCalendarAccessToken = tokens.access_token;
      user.googleCalendarRefreshToken = tokens.refresh_token || user.googleCalendarRefreshToken;
      user.googleCalendarTokenExpiry = tokens.expiry_date ? new Date(tokens.expiry_date) : undefined;
      await user.save();
    } catch (saveError: any) {
      console.error('Error saving Google Calendar tokens:', saveError);
      return NextResponse.redirect(
        new URL('/settings?calendar=error&message=save-failed', baseUrl)
      );
    }

    // Redirect to settings with success
    return NextResponse.redirect(
      new URL('/settings?calendar=connected&success=true', baseUrl)
    );
  } catch (error: any) {
    console.error('Error in Google Calendar callback:', error);
    let baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    baseUrl = baseUrl.replace(/\/$/, '');
    return NextResponse.redirect(
      new URL(`/settings?calendar=error&message=${encodeURIComponent(error.message || 'Unknown error')}`, baseUrl)
    );
  }
}
