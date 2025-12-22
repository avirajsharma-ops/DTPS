'use client';

import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
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
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

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
        redirect: false,
      });

      if (result?.error) {
        setError('Wrong email or password');
      } else {
        // Get the updated session to verify client role
        const session = await getSession();
        if (session?.user) {
          // Only allow clients to use this login
          if (session.user.role === 'client') {
            router.push('/user');
          } else {
            // Redirect non-clients to their appropriate dashboard
            setError('This login is for clients only. Please use the main login page.');
          }
        }
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white md:bg-gray-50">
      {/* Header - Hidden on larger screens */}
      <div className="flex items-center justify-between p-4 md:hidden">
        <Link href="/" className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-[#E06A26] font-semibold text-lg">Log In</h1>
        <div className="w-6" />
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
            <Alert variant="destructive" className="text-red-300 border-red-800 bg-red-900/30">
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
              href="/auth/forgot-password"
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
                <LoadingSpinner size="sm" className="mr-2" />
                Logging in...
              </>
            ) : (
              <>
                Log In
                <span className="ml-2">→</span>
              </>
            )}
          </Button>
        </form>

          {/* Divider */}
          <div className="w-full my-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 tracking-wider text-gray-500 uppercase bg-white md:bg-white">
                  Or continue with
                </span>
              </div>
            </div>
          </div>

          {/* Social Login Buttons */}
          <div className="flex w-full gap-3 sm:gap-4">
            <button
              type="button"
              className="flex-1 h-12 sm:h-14 bg-white border-2 border-[#3AB1A0]/30 rounded-xl flex items-center justify-center hover:bg-[#3AB1A0]/5 hover:border-[#3AB1A0] transition-colors shadow-sm"
            >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          </button>
            <button
              type="button"
              className="flex-1 h-12 sm:h-14 bg-white border-2 border-[#3AB1A0]/30 rounded-xl flex items-center justify-center hover:bg-gray-800 transition-colors shadow-sm"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-b" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
              </svg>
            </button>
          </div>

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
