import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import WooCommerceClient from '@/lib/db/models/WooCommerceClient';
import { UserRole } from '@/types';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        try {
          await connectDB();

          // First, try to find user in main User collection
          const user = await User.findOne({
            email: credentials.email.toLowerCase()
          }).select('+password');

          if (user) {
            const isPasswordValid = await user.comparePassword(credentials.password);

            if (!isPasswordValid) {
              throw new Error('Wrong email or password');
            }

            if (user.status !== 'active') {
              throw new Error('Account is not active. Please contact support.');
            }

            // Update lastLoginAt
            await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

            return {
              id: user._id.toString(),
              email: user.email,
              name: user.fullName,
              role: user.role,
              firstName: user.firstName,
              lastName: user.lastName,
              avatar: user.avatar,
              emailVerified: user.emailVerified
            };
          }

          // If not found in User collection, check WooCommerceClient collection
          const wooClient = await WooCommerceClient.findOne({
            email: credentials.email.toLowerCase()
          });

          if (wooClient) {
            // For WooCommerce clients, use plain text password comparison
            if (wooClient.password !== credentials.password) {
              throw new Error('Wrong email or password');
            }

            return {
              id: wooClient._id.toString(),
              email: wooClient.email,
              name: wooClient.name,
              role: UserRole.CLIENT,
              firstName: wooClient.name.split(' ')[0] || wooClient.name,
              lastName: wooClient.name.split(' ').slice(1).join(' ') || '',
              avatar: undefined,
              emailVerified: true,
              isWooCommerceClient: true,
              phone: wooClient.phone,
              city: wooClient.city,
              country: wooClient.country,
              totalOrders: wooClient.totalOrders,
              totalSpent: wooClient.totalSpent
            };
          }

          throw new Error('Wrong email or password');
        } catch (error) {
          console.error('Auth error:', error);
          throw error;
        }
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/calendar'
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      // Initial sign in
      if (user) {
        token.role = user.role;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.avatar = user.avatar;
        token.emailVerified = !!user.emailVerified;

        // Store WooCommerce client specific data
        if (user.isWooCommerceClient) {
          token.isWooCommerceClient = true;
          token.phone = user.phone;
          token.city = user.city;
          token.country = user.country;
          token.totalOrders = user.totalOrders;
          token.totalSpent = user.totalSpent;
        }
      }

      // Handle Google account linking to store calendar tokens
      if (account && account.provider === 'google') {
        token.googleAccessToken = account.access_token;
        token.googleRefreshToken = account.refresh_token;
        token.googleTokenExpiry = account.expires_at ? new Date(account.expires_at * 1000) : undefined;

        // Store tokens in database for later use
        try {
          await connectDB();
          const dbUser = await User.findById(token.sub);
          if (dbUser) {
            dbUser.googleCalendarAccessToken = account.access_token;
            dbUser.googleCalendarRefreshToken = account.refresh_token;
            dbUser.googleCalendarTokenExpiry = account.expires_at ? new Date(account.expires_at * 1000) : undefined;
            await dbUser.save();
          }
        } catch (error) {
          console.error('Error storing Google Calendar tokens:', error);
        }
      }

      // Handle session update
      if (trigger === 'update' && session) {
        token = { ...token, ...session };
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        session.user.role = token.role as UserRole;
        session.user.firstName = token.firstName as string;
        session.user.lastName = token.lastName as string;
        session.user.avatar = token.avatar as string;
        session.user.emailVerified = token.emailVerified as boolean;

        // Include WooCommerce client specific data
        if (token.isWooCommerceClient) {
          session.user.isWooCommerceClient = true;
          session.user.phone = token.phone as string;
          session.user.city = token.city as string;
          session.user.country = token.country as string;
          session.user.totalOrders = token.totalOrders as number;
          session.user.totalSpent = token.totalSpent as number;
        }
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  events: {
    async signIn({ user, isNewUser }) {
      if (isNewUser) {
      }
    },
    async signOut({ token }) {
    }
  },
  debug: process.env.NODE_ENV === 'development' && process.env.NEXT_DEBUG_AUTH === 'true',
};
