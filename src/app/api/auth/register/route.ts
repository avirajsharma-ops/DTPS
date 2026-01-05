import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import { UserRole } from '@/types';
import { z } from 'zod';

// Comprehensive registration schema for API
// Helper function to normalize phone number with country code
function normalizePhoneNumber(phone: string, defaultCountryCode: string = '+91'): string {
  if (!phone) return '';
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  // If doesn't start with +, add default country code
  if (!cleaned.startsWith('+')) {
    // If starts with 0, remove it
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    cleaned = defaultCountryCode + cleaned;
  }
  return cleaned;
}

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().optional(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum([UserRole.HEALTH_COUNSELOR, UserRole.DIETITIAN]),
  phone: z.string().min(1, 'Phone number is required'),

  // Dietitian/Health Counselor specific fields
  credentials: z.array(z.string()).optional(),
  specializations: z.array(z.string()).optional(),
  experience: z.number().min(0).optional(),
  bio: z.string().max(1000).optional(),
  consultationFee: z.number().min(0).optional(),

  // Client specific fields (kept for compatibility)
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  height: z.number().min(30, 'Height must be at least 30 cm').max(250, 'Height cannot exceed 250 cm').optional(),
  weight: z.number().min(20, 'Weight must be at least 20 kg').max(300, 'Weight cannot exceed 300 kg').optional(),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']).optional(),
  healthGoals: z.array(z.string()).optional(),
  medicalConditions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
  assignedDietitian: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = registerSchema.parse(body);
    
    await connectDB();
    
    // Check if user already exists by email
    const existingUser = await User.findOne({ 
      email: validatedData.email.toLowerCase() 
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Normalize phone number with country code
    const normalizedPhone = normalizePhoneNumber(validatedData.phone);
    
    if (!normalizedPhone || normalizedPhone.length < 12) {
      return NextResponse.json(
        { error: 'Phone number is required. Please include country code (e.g., +91XXXXXXXXXX)' },
        { status: 400 }
      );
    }

    // Check if phone number already exists
    const existingPhone = await User.findOne({ 
      phone: normalizedPhone 
    });
    
    if (existingPhone) {
      return NextResponse.json(
        { error: 'This phone number is already registered with another account' },
        { status: 400 }
      );
    }
    
    // Verify password confirmation if provided
    if (validatedData.confirmPassword && validatedData.password !== validatedData.confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    // Create user data
    const userData: any = {
      email: validatedData.email.toLowerCase(),
      password: validatedData.password,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      role: validatedData.role,
      phone: normalizedPhone,
    };
    
    // Add role-specific fields
    if (validatedData.role === UserRole.DIETITIAN) {
      userData.credentials = validatedData.credentials || [];
      userData.specializations = validatedData.specializations || [];
      userData.experience = validatedData.experience;
      userData.bio = validatedData.bio;
      userData.consultationFee = validatedData.consultationFee;
    } else if (validatedData.role === UserRole.CLIENT) {
      if (validatedData.dateOfBirth) {
        userData.dateOfBirth = new Date(validatedData.dateOfBirth);
      }
      userData.gender = validatedData.gender;
      userData.height = validatedData.height;
      userData.weight = validatedData.weight;
      userData.activityLevel = validatedData.activityLevel;
      userData.healthGoals = validatedData.healthGoals || [];
      userData.medicalConditions = validatedData.medicalConditions || [];
      userData.allergies = validatedData.allergies || [];
      userData.dietaryRestrictions = validatedData.dietaryRestrictions || [];
      userData.assignedDietitian = validatedData.assignedDietitian;
      userData.notes = validatedData.notes;
    }
    
    // Create user
    const user = new User(userData);
    await user.save();
    
    // Return user without password
    const userResponse = user.toJSON();
    delete userResponse.password;
    
    return NextResponse.json(
      { 
        message: 'User registered successfully',
        user: userResponse
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation error',
          details: error.issues
        },
        { status: 400 }
      );
    }
    
    if (error instanceof Error && error.message.includes('E11000')) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
