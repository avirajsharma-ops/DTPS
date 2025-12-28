'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countryCode, setCountryCode] = useState('+91');

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
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Registration failed');
      }

      setSuccess('Account created successfully! Redirecting to onboarding...');
      setTimeout(() => {
        router.push('/user/onboarding');
      }, 2000);

    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

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

          {/* Divider */}
          <div className="w-full my-4 sm:my-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 text-gray-500 uppercase tracking-wider bg-white md:bg-white">
                  Or sign up with
                </span>
              </div>
            </div>
          </div>

          {/* Social Signup Buttons */}
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
