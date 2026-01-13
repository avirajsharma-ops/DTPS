import { UserRole } from './index';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      firstName: string;
      lastName: string;
      avatar?: string;
      emailVerified: boolean;
      // Onboarding status for client users
      onboardingCompleted?: boolean;
      // WooCommerce client specific fields
      isWooCommerceClient?: boolean;
      phone?: string;
      city?: string;
      country?: string;
      totalOrders?: number;
      totalSpent?: number;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    firstName: string;
    lastName: string;
    avatar?: string;
    emailVerified: boolean;
    // Onboarding status for client users
    onboardingCompleted?: boolean;
    // WooCommerce client specific fields
    isWooCommerceClient?: boolean;
    phone?: string;
    city?: string;
    country?: string;
    totalOrders?: number;
    totalSpent?: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: UserRole;
    firstName: string;
    lastName: string;
    avatar?: string;
    emailVerified: boolean;
    // Onboarding status for client users
    onboardingCompleted?: boolean;
    // WooCommerce client specific fields
    isWooCommerceClient?: boolean;
    phone?: string;
    city?: string;
    country?: string;
    totalOrders?: number;
    totalSpent?: number;
  }
}
