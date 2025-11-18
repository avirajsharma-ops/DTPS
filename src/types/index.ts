import { Document } from 'mongoose';

// User Types
export enum UserRole {
  ADMIN = 'admin',
  DIETITIAN = 'dietitian',
  HEALTH_COUNSELOR = 'health_counselor',
  CLIENT = 'client'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

export interface IUser extends Document {
  _id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  phone?: string;
  avatar?: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Dietitian specific fields
  credentials?: string[];
  specializations?: string[];
  experience?: number;
  bio?: string;
  consultationFee?: number;
  availability?: {
    day: string;
    startTime: string;
    endTime: string;
  }[];
  
  // Client specific fields
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
  height?: number; // in cm
  weight?: number; // in kg
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  healthGoals?: string[];
  medicalConditions?: string[];
  allergies?: string[];
  dietaryRestrictions?: string[];
  assignedDietitian?: string;
}

// Appointment Types
export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show'
}

export enum AppointmentType {
  CONSULTATION = 'consultation',
  FOLLOW_UP = 'follow_up',
  FOLLOW_UP_HYPHEN = 'follow-up', // Support both formats
  GROUP_SESSION = 'group_session',
  VIDEO_CONSULTATION = 'video_consultation',
  INITIAL_CONSULTATION = 'initial_consultation',
  NUTRITION_ASSESSMENT = 'nutrition_assessment'
}

export interface IZoomMeetingDetails {
  meetingId: string;
  meetingUuid?: string;
  joinUrl: string;
  startUrl: string;
  password?: string;
  hostEmail?: string;
}

export interface IAppointment extends Document {
  _id: string;
  dietitian: string;
  client: string;
  type: AppointmentType;
  status: AppointmentStatus;
  scheduledAt: Date;
  duration: number; // in minutes
  notes?: string;
  meetingLink?: string; // Legacy field for backward compatibility
  zoomMeeting?: IZoomMeetingDetails;
  createdAt: Date;
  updatedAt: Date;
}

// Meal Plan Types
export interface INutrition {
  calories: number;
  protein: number; // in grams
  carbs: number; // in grams
  fat: number; // in grams
  fiber?: number; // in grams
  sugar?: number; // in grams
  sodium?: number; // in mg
}

export interface IRecipe extends Document {
  _id: string;
  name: string;
  description?: string;
  ingredients: {
    name: string;
    quantity: number;
    unit: string;
  }[];
  instructions: string[];
  prepTime: number; // in minutes
  cookTime: number; // in minutes
  servings: number;
  nutrition: INutrition;
  tags: string[];
  medicalContraindications?: string[];
  image?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMealPlan extends Document {
  _id: string;
  name: string;
  description?: string;
  dietitian: string;
  client: string;
  startDate: Date;
  endDate: Date;
  dailyCalorieTarget: number;
  dailyMacros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  meals: {
    day: number; // 1-7 for days of week
    breakfast: string[]; // recipe IDs
    lunch: string[]; // recipe IDs
    dinner: string[]; // recipe IDs
    snacks: string[]; // recipe IDs
  }[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Message Types
export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  VOICE = 'voice',
  FILE = 'file',
  EMOJI = 'emoji',
  STICKER = 'sticker',
  LOCATION = 'location',
  CONTACT = 'contact',
  CALL_MISSED = 'call_missed'
}

export enum MessageStatus {
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed'
}

export interface IAttachment {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  thumbnail?: string;
  duration?: number; // for audio/video files
  width?: number; // for images/videos
  height?: number; // for images/videos
}

export interface IMessageReaction {
  emoji: string;
  userId: string;
  createdAt: Date;
}

export interface IMessage extends Document {
  _id: string;
  sender: string;
  receiver: string;
  type: MessageType;
  content: string;
  attachments?: IAttachment[];
  status: MessageStatus;
  isRead: boolean;
  readAt?: Date;
  deliveredAt?: Date;
  editedAt?: Date;
  deletedAt?: Date;
  replyTo?: string; // ID of message being replied to
  reactions?: IMessageReaction[];
  isForwarded?: boolean;
  forwardedFrom?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Payment Types
export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

export enum PaymentType {
  CONSULTATION = 'consultation',
  SUBSCRIPTION = 'subscription',
  MEAL_PLAN = 'meal_plan'
}

export interface IPayment extends Document {
  _id: string;
  client: string;
  dietitian: string;
  type: PaymentType;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: string;
  transactionId?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Progress Tracking Types
export interface IProgressEntry extends Document {
  _id: string;
  user: string;
  type: string;
  value: number;
  unit?: string;
  notes?: string;
  recordedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Food Log Types
export interface IFoodLog extends Document {
  _id: string;
  client: string;
  date: Date;
  meals: {
    type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    foods: {
      name: string;
      quantity: number;
      unit: string;
      calories: number;
      nutrition: Partial<INutrition>;
    }[];
  }[];
  totalNutrition: INutrition;
  createdAt: Date;
  updatedAt: Date;
}
