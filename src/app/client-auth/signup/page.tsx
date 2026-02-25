'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Eye,
  EyeOff,
  User,
  Mail,
  Lock,
  Shield,
  Gift,
  ArrowLeft,
  Leaf,
  Phone
} from 'lucide-react';
import { z } from 'zod';
import { COUNTRY_CODES } from '@/lib/constants/countries';

// Client-specific signup schema with separate first and last name
const clientSignUpSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  referralCode: z.string().optional(),
  agreeToTerms: z.boolean().refine(val => val === true, {
    message: 'You must agree to the terms and conditions',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ClientSignUpInput = z.infer<typeof clientSignUpSchema>;

export default function ClientSignUpPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      if (session.user.role === 'client') {
        router.replace('/user');
      } else if (session.user.role === 'admin') {
        router.replace('/dashboard/admin');
      } else if (session.user.role === 'dietitian') {
        router.replace('/dashboard/dietitian');
      } else if (session.user.role === 'health_counselor') {
        router.replace('/health-counselor/clients');
      }
    }
  }, [status, session, router]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ClientSignUpInput>({
    resolver: zodResolver(clientSignUpSchema),
    defaultValues: {
      agreeToTerms: false,
    },
  });

  const agreeToTerms = watch('agreeToTerms');

  const onSubmit = async (data: ClientSignUpInput) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // Combine country code with phone number
      const phoneWithCode = `${countryCode}${data.phone.replace(/\s+/g, '')}`;

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: phoneWithCode,
          password: data.password,
          confirmPassword: data.confirmPassword,
          referralCode: data.referralCode,
          role: 'client', // Always set role as client
          signupContext: 'client'
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Registration failed');
      }

      setSuccess('Account created successfully! Logging you in...');

      // Auto-login the user after successful registration
      const signInResult = await signIn('credentials', {
        email: data.email,
        password: data.password,
        loginContext: 'client',
        redirect: false,
        callbackUrl: '/user/onboarding',
      });

      if (signInResult?.error) {
        // If auto-login fails, redirect to login page
        setError('Account created but auto-login failed. Please sign in manually.');
        setTimeout(() => {
          router.push('/client-auth/signin');
        }, 2000);
        return;
      }

      // Redirect to onboarding after successful auto-login
      router.replace('/user/onboarding');

    } catch (err) {
      console.error('Registration error:', err);
      if (err instanceof Error) {
        // Handle specific error messages
        if (err.message.includes('already exists') || err.message.includes('already registered')) {
          setError(err.message);
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          setError('Network error. Please check your connection and try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
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
  if (status === 'authenticated') return null;

  return (
    <div className="flex flex-col min-h-screen bg-white md:bg-gray-50">
      {/* Header - Hidden on larger screens */}
      <div className="flex items-center justify-center p-4 md:hidden">

        <h1 className="text-[#E06A26] font-semibold   text-center text-lg">Sign Up</h1>

      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center flex-1 px-4 py-6 overflow-y-auto sm:px-6 md:px-8">
        {/* Card wrapper for larger screens */}
        <div className="w-full max-w-md md:bg-white md:rounded-2xl md:shadow-lg md:p-8 lg:p-10">
          {/* Logo */}
          <div className="flex items-center justify-center overflow-hidden w-20 h-20 mx-auto rounded-xl sm:w-24 sm:h-24 md:w-28 md:h-28">
            <img
              src="/images/dtps-logo.png"
              alt="DTPS"
              className="object-cover w-full h-full"
            />
          </div>

          {/* Title */}
          <div className="w-full mb-4 text-center sm:mb-6">
            <h2 className="text-xl font-bold text-[#E06A26] sm:text-2xl">Create Account</h2>
            <p className="mt-1 text-sm text-gray-600 sm:text-base">
              Track your macros, crush your goals, and join a community of achievers.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-3 sm:space-y-4">
            {error && (
              <Alert variant="destructive" className="text-red-700 border-red-200 bg-red-50">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="text-green-300 border-green-800 bg-green-900/30">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {/* Full Name Input */}
            {/* First Name Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <User className="h-5 w-5 text-[#3AB1A0]" />
              </div>
              <Input
                type="text"
                placeholder="First Name"
                {...register('firstName')}
                className={`h-12 sm:h-14 pl-12 bg-[#3AB1A0]/5 border-[#3AB1A0]/20 text-black placeholder:text-gray-400 rounded-xl focus:border-[#3AB1A0] focus:ring-[#3AB1A0] focus:bg-white ${errors.firstName ? 'border-red-500' : ''}`}
              />
            </div>
            {errors.firstName && (
              <p className="-mt-2 text-sm text-red-400">{errors.firstName.message}</p>
            )}

            {/* Last Name Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <User className="h-5 w-5 text-[#3AB1A0]" />
              </div>
              <Input
                type="text"
                placeholder="Last Name"
                {...register('lastName')}
                className={`h-12 sm:h-14 pl-12 bg-[#3AB1A0]/5 border-[#3AB1A0]/20 text-black placeholder:text-gray-400 rounded-xl focus:border-[#3AB1A0] focus:ring-[#3AB1A0] focus:bg-white ${errors.lastName ? 'border-red-500' : ''}`}
              />
            </div>
            {errors.lastName && (
              <p className="-mt-2 text-sm text-red-400">{errors.lastName.message}</p>
            )}

            {/* Email Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <Mail className="h-5 w-5 text-[#3AB1A0]" />
              </div>
              <Input
                type="email"
                placeholder="Email Address"
                {...register('email')}
                className={`h-12 sm:h-14 pl-12 bg-[#3AB1A0]/5 border-[#3AB1A0]/20 text-black placeholder:text-gray-400 rounded-xl focus:border-[#3AB1A0] focus:ring-[#3AB1A0] focus:bg-white ${errors.email ? 'border-red-500' : ''}`}
              />
            </div>
            {errors.email && (
              <p className="-mt-2 text-sm text-red-400">{errors.email.message}</p>
            )}

            {/* Phone Input with Country Code */}
            <div className="space-y-1">
              <div className="flex gap-2">
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger className="w-28 h-12 sm:h-14 bg-[#3AB1A0]/5 border-[#3AB1A0]/20 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {COUNTRY_CODES.map((country) => (
                      <SelectItem key={`${country.code}-${country.country}`} value={country.code}>
                        <span className="flex items-center gap-2">
                          <span>{country.flag}</span>
                          <span>{country.code}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                  <Input
                    type="tel"
                    placeholder="Phone Number"
                    {...register('phone')}
                    className={`h-12 sm:h-14 bg-[#3AB1A0]/5 border-[#3AB1A0]/20 text-black placeholder:text-gray-400 rounded-xl focus:border-[#3AB1A0] focus:ring-[#3AB1A0] focus:bg-white ${errors.phone ? 'border-red-500' : ''}`}
                  />
                </div>
              </div>
            </div>
            {errors.phone && (
              <p className="-mt-2 text-sm text-red-400">{errors.phone.message}</p>
            )}

            {/* Password Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <Lock className="h-5 w-5 text-[#3AB1A0]" />
              </div>
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
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
              <p className="-mt-2 text-sm text-red-400">{errors.password.message}</p>
            )}

            {/* Confirm Password Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <Shield className="h-5 w-5 text-[#3AB1A0]" />
              </div>
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm Password"
                {...register('confirmPassword')}
                className={`h-12 sm:h-14 pl-12 pr-12 bg-[#3AB1A0]/5 border-[#3AB1A0]/20 text-black placeholder:text-gray-400 rounded-xl focus:border-[#3AB1A0] focus:ring-[#3AB1A0] focus:bg-white ${errors.confirmPassword ? 'border-red-500' : ''}`}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-4"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <Eye className="w-5 h-5 text-gray-500" />
                ) : (
                  <EyeOff className="w-5 h-5 text-gray-500" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="-mt-2 text-sm text-red-400">{errors.confirmPassword.message}</p>
            )}

            {/* Referral Code Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <Gift className="h-5 w-5 text-[#DB9C6E]" />
              </div>
              <Input
                type="text"
                placeholder="Referral Code (Optional)"
                {...register('referralCode')}
                className="h-12 sm:h-14 pl-12 bg-[#3AB1A0]/5 border-[#3AB1A0]/20 text-black placeholder:text-gray-400 rounded-xl focus:border-[#3AB1A0] focus:ring-[#3AB1A0] focus:bg-white"
              />
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start gap-3 py-2">
              <Checkbox
                id="terms"
                checked={agreeToTerms}
                onCheckedChange={(checked) => setValue('agreeToTerms', checked as boolean)}
                className="mt-0.5 border-[#3AB1A0] data-[state=checked]:bg-[#3AB1A0] data-[state=checked]:border-[#3AB1A0]"
              />
              <label htmlFor="terms" className="text-sm leading-tight text-gray-600">
                I agree to the{' '}
                <Link href="/terms" className="text-[#E06A26] hover:underline font-medium">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-[#E06A26] hover:underline font-medium">
                  Privacy Policy
                </Link>
                .
              </label>
            </div>
            {errors.agreeToTerms && (
              <p className="-mt-2 text-sm text-red-400">{errors.agreeToTerms.message}</p>
            )}

            {/* Sign Up Button */}
            <Button
              type="submit"
              className="w-full h-12 sm:h-14 bg-[#61a035] hover:bg-[#60953a] text-white font-semibold text-base sm:text-lg rounded-xl shadow-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>

                  Creating account...
                </>
              ) : (
                <>
                  Sign Up

                </>
              )}
            </Button>
          </form>



          {/* Login Link */}
          <p className="mt-6 text-center text-gray-600 text-sm sm:text-base sm:mt-8">
            Already have an account?{' '}
            <Link href="/client-auth/signin" className="text-[#E06A26] font-semibold hover:underline">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
