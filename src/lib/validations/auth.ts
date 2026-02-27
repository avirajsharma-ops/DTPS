import { z } from 'zod';
import { UserRole } from '@/types';

// Email validation regex that ensures:
// 1. Local part contains at least one letter (not just numbers)
// 2. Has proper format with @ symbol
// 3. Domain has at least one dot
const EMAIL_REGEX = /^(?=.*[a-zA-Z])[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Helper function to validate email - exported for use in other files
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  if (!email || email.trim() === '') {
    return { isValid: false, error: 'Email is required' };
  }

  // Check for basic email format
  if (!email.includes('@')) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  // Check if local part is only numbers
  const localPart = email.split('@')[0];
  if (/^\d+$/.test(localPart)) {
    return { isValid: false, error: 'Email cannot contain only numbers before @' };
  }

  // Check full email format with regex
  if (!EMAIL_REGEX.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address (e.g., name@example.com)' };
  }

  return { isValid: true };
};

export const signInSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .refine((email) => {
      // Check if local part has at least one letter
      const localPart = email.split('@')[0];
      return /[a-zA-Z]/.test(localPart);
    }, { message: 'Email must contain letters, not just numbers' })
    .refine((email) => EMAIL_REGEX.test(email), {
      message: 'Please enter a valid email address (e.g., name@example.com)'
    }),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

export const signUpSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .refine((email) => {
      // Check if local part has at least one letter
      const localPart = email.split('@')[0];
      return /[a-zA-Z]/.test(localPart);
    }, { message: 'Email must contain letters, not just numbers' })
    .refine((email) => EMAIL_REGEX.test(email), {
      message: 'Please enter a valid email address (e.g., name@example.com)'
    }),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters'),
  role: z.enum([UserRole.HEALTH_COUNSELOR, UserRole.DIETITIAN], {
    message: 'Please select a role',
  }),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .refine((val) => {
      // Allow phone with or without country code - will be normalized
      const cleaned = val.replace(/[\s\-\(\)]/g, '');
      return /^\+?\d{10,15}$/.test(cleaned);
    }, {
      message: 'Invalid phone number format. Please enter 10-15 digits.',
    }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const dietitianProfileSchema = z.object({
  credentials: z
    .array(z.string())
    .min(1, 'At least one credential is required'),
  specializations: z
    .array(z.string())
    .min(1, 'At least one specialization is required'),
  experience: z
    .number()
    .min(0, 'Experience cannot be negative')
    .max(50, 'Experience cannot exceed 50 years'),
  bio: z
    .string()
    .max(1000, 'Bio must be less than 1000 characters')
    .optional(),
  consultationFee: z
    .number()
    .min(0, 'Consultation fee cannot be negative')
    .max(10000, 'Consultation fee seems too high'),
});

export const clientProfileSchema = z.object({
  dateOfBirth: z
    .string()
    .refine((date) => {
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      return age >= 13 && age <= 120;
    }, 'Age must be between 13 and 120 years'),
  gender: z.enum(['male', 'female', 'other'], {
    message: 'Please select your gender',
  }),
  height: z
    .number()
    .min(100, 'Height must be at least 100 cm')
    .max(250, 'Height cannot exceed 250 cm'),
  weight: z
    .number()
    .min(30, 'Weight must be at least 30 kg')
    .max(300, 'Weight cannot exceed 300 kg'),
  activityLevel: z.enum(
    ['sedentary', 'light', 'moderate', 'active', 'very_active'],
    {
      message: 'Please select your activity level',
    }
  ),
  healthGoals: z
    .array(z.string())
    .min(1, 'Please select at least one health goal'),
  medicalConditions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
});

export const updateProfileSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters')
    .optional(),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters')
    .optional(),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || /^\+?[\d\s\-\(\)]+$/.test(val), {
      message: 'Invalid phone number format',
    }),
  avatar: z.string().url('Invalid avatar URL').optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(6, 'New password must be at least 6 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmNewPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "New passwords don't match",
  path: ['confirmNewPassword'],
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type DietitianProfileInput = z.infer<typeof dietitianProfileSchema>;
export type ClientProfileInput = z.infer<typeof clientProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
