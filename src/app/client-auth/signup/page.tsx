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
import { 
  Eye, 
  EyeOff, 
  User, 
  Mail, 
  Lock, 
  Shield, 
  Gift, 
  ArrowLeft, 
  Leaf 
} from 'lucide-react';
import { z } from 'zod';

// Client-specific signup schema with full name
const clientSignUpSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().optional(),
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

// Function to split full name into first and last name
const splitFullName = (fullName: string): { firstName: string; lastName: string } => {
  const nameParts = fullName.trim().split(/\s+/);
  if (nameParts.length === 1) {
    return { firstName: nameParts[0], lastName: '' };
  }
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ');
  return { firstName, lastName };
};

export default function ClientSignUpPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
      // Split full name into first and last name
      const { firstName, lastName } = splitFullName(data.fullName);

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email: data.email,
          phone: data.phone,
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

      setSuccess('Account created successfully! Redirecting to sign in...');
      setTimeout(() => {
        router.push('/client-auth/signin');
      }, 2000);

    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <Link href="/" className="text-white/70 hover:text-white">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-white font-semibold text-lg">Sign Up</h1>
        <div className="w-6" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center px-6 pb-8 overflow-y-auto">
        {/* Hero Image */}
        <div className="w-full max-w-sm mb-6">
          <div className="relative h-40 rounded-2xl overflow-hidden bg-gradient-to-br from-green-600 via-green-500 to-emerald-400">
            {/* Decorative waves */}
            <div className="absolute inset-0 opacity-30">
              <svg viewBox="0 0 400 160" className="w-full h-full">
                <path
                  d="M0 80 Q100 20 200 80 T400 80 V160 H0 Z"
                  fill="rgba(255,255,255,0.1)"
                />
                <path
                  d="M0 100 Q100 40 200 100 T400 100 V160 H0 Z"
                  fill="rgba(255,255,255,0.1)"
                />
              </svg>
            </div>
            {/* Icon */}
            <div className="absolute bottom-4 left-4">
              <div className="h-12 w-12 rounded-full bg-gradient-to-b from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
                <Leaf className="h-6 w-6 text-[#1a1a1a] transform -rotate-45" strokeWidth={2.5} />
              </div>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="w-full max-w-sm mb-6">
          <h2 className="text-2xl font-bold text-white">Create Account</h2>
          <p className="text-gray-400 mt-1">
            Track your macros, crush your goals, and join a community of achievers.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm space-y-4">
          {error && (
            <Alert variant="destructive" className="bg-red-900/30 border-red-800 text-red-300">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-900/30 border-green-800 text-green-300">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Full Name Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-500" />
            </div>
            <Input
              type="text"
              placeholder="Full Name"
              {...register('fullName')}
              className={`h-14 pl-12 bg-[#2a3a2a] border-[#3a4a3a] text-white placeholder:text-gray-500 rounded-xl focus:border-[#c4a962] focus:ring-[#c4a962] ${errors.fullName ? 'border-red-500' : ''}`}
            />
          </div>
          {errors.fullName && (
            <p className="text-sm text-red-400 -mt-2">{errors.fullName.message}</p>
          )}

          {/* Email or Phone Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-500" />
            </div>
            <Input
              type="email"
              placeholder="Email or Phone Number"
              {...register('email')}
              className={`h-14 pl-12 bg-[#2a3a2a] border-[#3a4a3a] text-white placeholder:text-gray-500 rounded-xl focus:border-[#c4a962] focus:ring-[#c4a962] ${errors.email ? 'border-red-500' : ''}`}
            />
          </div>
          {errors.email && (
            <p className="text-sm text-red-400 -mt-2">{errors.email.message}</p>
          )}

          {/* Password Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-500" />
            </div>
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              {...register('password')}
              className={`h-14 pl-12 pr-12 bg-[#2a3a2a] border-[#3a4a3a] text-white placeholder:text-gray-500 rounded-xl focus:border-[#c4a962] focus:ring-[#c4a962] ${errors.password ? 'border-red-500' : ''}`}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-4 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <Eye className="h-5 w-5 text-gray-500" />
              ) : (
                <EyeOff className="h-5 w-5 text-gray-500" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-400 -mt-2">{errors.password.message}</p>
          )}

          {/* Confirm Password Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Shield className="h-5 w-5 text-gray-500" />
            </div>
            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm Password"
              {...register('confirmPassword')}
              className={`h-14 pl-12 pr-12 bg-[#2a3a2a] border-[#3a4a3a] text-white placeholder:text-gray-500 rounded-xl focus:border-[#c4a962] focus:ring-[#c4a962] ${errors.confirmPassword ? 'border-red-500' : ''}`}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-4 flex items-center"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <Eye className="h-5 w-5 text-gray-500" />
              ) : (
                <EyeOff className="h-5 w-5 text-gray-500" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-red-400 -mt-2">{errors.confirmPassword.message}</p>
          )}

          {/* Referral Code Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Gift className="h-5 w-5 text-gray-500" />
            </div>
            <Input
              type="text"
              placeholder="Referral Code (Optional)"
              {...register('referralCode')}
              className="h-14 pl-12 bg-[#2a3a2a] border-[#3a4a3a] text-white placeholder:text-gray-500 rounded-xl focus:border-[#c4a962] focus:ring-[#c4a962]"
            />
          </div>

          {/* Terms Checkbox */}
          <div className="flex items-start gap-3 py-2">
            <Checkbox
              id="terms"
              checked={agreeToTerms}
              onCheckedChange={(checked) => setValue('agreeToTerms', checked as boolean)}
              className="mt-0.5 border-gray-500 data-[state=checked]:bg-[#c4a962] data-[state=checked]:border-[#c4a962]"
            />
            <label htmlFor="terms" className="text-sm text-gray-400 leading-tight">
              I agree to the{' '}
              <Link href="/terms" className="text-[#c4a962] hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-[#c4a962] hover:underline">
                Privacy Policy
              </Link>
              .
            </label>
          </div>
          {errors.agreeToTerms && (
            <p className="text-sm text-red-400 -mt-2">{errors.agreeToTerms.message}</p>
          )}

          {/* Sign Up Button */}
          <Button
            type="submit"
            className="w-full h-14 bg-[#c4a962] hover:bg-[#b39952] text-black font-semibold text-lg rounded-xl"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Creating account...
              </>
            ) : (
              <>
                Sign Up
                <span className="ml-2">→</span>
              </>
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="w-full max-w-sm my-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#1a1a1a] text-gray-500">
                Or sign up with
              </span>
            </div>
          </div>
        </div>

        {/* Social Signup Buttons */}
        <div className="flex gap-4 w-full max-w-sm">
          <button
            type="button"
            className="flex-1 h-14 bg-[#2a3a2a] border border-[#3a4a3a] rounded-xl flex items-center justify-center hover:bg-[#3a4a3a] transition-colors"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24">
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
            className="flex-1 h-14 bg-[#2a3a2a] border border-[#3a4a3a] rounded-xl flex items-center justify-center hover:bg-[#3a4a3a] transition-colors"
          >
            <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
            </svg>
          </button>
        </div>

        {/* Login Link */}
        <p className="mt-8 text-gray-400">
          Already have an account?{' '}
          <Link href="/client-auth/signin" className="text-[#c4a962] font-semibold hover:underline">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}
