'use client';

import { useState, useEffect, useRef } from 'react';
import { signIn, getSession, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, Leaf } from 'lucide-react';
import { signInSchema, SignInInput } from '@/lib/validations/auth';
import Image from 'next/image';

export default function ClientSignInPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const redirectAttemptedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (!mounted) return;
    if (status !== 'authenticated' || !session?.user) return;
    if (redirectAttemptedRef.current) return;

    // Prevent navigation ping-pong loops (common in mobile/webview when cookies/session fail)
    const now = Date.now();
    const lockUntil = Number(sessionStorage.getItem('dtps:authRedirectLockUntil') || '0');
    if (lockUntil && now < lockUntil) {
      return;
    }

    redirectAttemptedRef.current = true;
    sessionStorage.setItem('dtps:authRedirectLockUntil', String(now + 2000));

    const role = (session.user.role || '').toLowerCase();
    if (role === 'client') {
      router.replace('/user');
    } else if (role.includes('admin')) {
      router.replace('/dashboard/admin');
    } else if (role === 'dietitian') {
      router.replace('/dashboard/dietitian');
    } else if (role === 'health_counselor') {
      router.replace('/health-counselor/clients');
    }
  }, [mounted, status, session?.user, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data: SignInInput) => {
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        loginContext: 'client',
        redirect: false,
        callbackUrl: '/user',
      });

      if (result?.error) {
        // Handle specific error types
        if (result.error === 'CredentialsSignin') {
          setError('Wrong email or password. Please try again.');
        } else if (result.error === 'Configuration') {
          setError('Server configuration error. Please try again later.');
        } else {
          setError(result.error || 'Wrong email or password');
        }
        return;
      }

      if (result?.ok) {
        // Login succeeded! Mark that we're redirecting to prevent loops
        redirectAttemptedRef.current = true;
        sessionStorage.setItem('dtps:authRedirectLockUntil', String(Date.now() + 3000));

        // Try to get session to verify role, but don't block on it
        try {
          const sessionData = await Promise.race([
            getSession(),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000))
          ]) as any;

          // If we got session and user is NOT a client, show error
          if (sessionData?.user && sessionData.user.role !== 'client') {
            setError('This login is for clients only. Please use the main login page.');
            setIsLoading(false);
            return;
          }
        } catch {
          // Ignore - we'll navigate anyway
        }

        // Use window.location for reliable full page navigation
        // This ensures cookies are properly set and session is established
        // Works better than router.replace() in webviews and avoids "stuck loading" issue
        window.location.href = '/user';
        return;
      }
    } catch (err) {
      console.error('Sign in error:', err);
      setError('An unexpected error occurred. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking session
  if (!mounted || status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#E06A26] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If already authenticated, redirect effect will run; don't show any intermediate UI.
  if (status === 'authenticated') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#E06A26] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white md:bg-gray-50">
      {/* Header - Hidden on larger screens */}
      <div className="flex items-center justify-center p-4 md:hidden">

        <h1 className="text-[#E06A26] text-center  font-semibold text-lg">Log In</h1>

      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center flex-1 px-4 py-4 overflow-y-auto sm:px-6 md:px-8">
        {/* Card wrapper for larger screens */}
        <div className="w-full max-w-md md:bg-white md:rounded-2xl md:shadow-lg md:p-8 lg:p-10">
          {/* Logo */}
          <div className="flex items-center justify-center overflow-hidden w-24 h-24 mx-auto rounded-xl sm:w-28 sm:h-28 md:w-32 md:h-32">
            <img
              src="/images/dtps-logo.png"
              alt="DTPS"
              className="object-cover w-full h-full"
            />
          </div>

          {/* App Name */}
          <Link href="/user" className="block text-2xl font-bold text-center text-[#E06A26] mt-4 mb-2 hover:text-[#d15a1a] transition-colors sm:text-3xl">DTPS</Link>
          <p className="mb-6 text-center text-gray-600 text-sm sm:text-base sm:mb-8">
            Welcome back! Please enter your details.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-4">
            {error && (
              <Alert variant="destructive" className="text-red-700 border-red-200 bg-red-50">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Email Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <Mail className="w-5 h-5 text-gray-500" />
                </div>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  {...register('email')}
                  className={`h-12 sm:h-14 pl-12 bg-[#3AB1A0]/5 border-[#3AB1A0]/20 text-black placeholder:text-gray-400 rounded-xl focus:border-[#3AB1A0] focus:ring-[#3AB1A0] focus:bg-white ${errors.email ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-400">{errors.email.message}</p>
              )}
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <Lock className="w-5 h-5 text-gray-500" />
                </div>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  className={`h-12 sm:h-14 pl-12 pr-12 bg-[#3AB1A0]/5 border-[#3AB1A0]/20 text-black placeholder:text-gray-400 rounded-xl focus:border-[#3AB1A0] focus:ring-[#3AB1A0] focus:bg-white ${errors.password ? 'border-red-500' : ''}`}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-4"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <Eye className="w-5 h-5 text-gray-500" />
                  ) : (
                    <EyeOff className="w-5 h-5 text-gray-500" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-400">{errors.password.message}</p>
              )}
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <Link
                href="/client-auth/forget-password"
                className="text-[#E06A26] text-sm hover:underline"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              className="w-full h-12 sm:h-14 bg-[#61a035] hover:bg-[#60953a] text-white font-semibold text-base sm:text-lg rounded-xl shadow-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>

                  Logging in...
                </>
              ) : (
                <>
                  Log In

                </>
              )}
            </Button>
          </form>



          {/* Sign Up Link */}
          <p className="mt-6 text-center text-gray-500 text-sm sm:text-base sm:mt-8">
            Don't have an account?{' '}
            <Link href="/client-auth/signup" className="text-[#E06A26] font-semibold hover:underline">
              Sign up for free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
