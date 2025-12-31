import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format user ID for display
 * Dietitian: Dt-XXXX (first 4 chars of MongoDB ObjectId)
 * Client: C-XXXX (first 4 chars of MongoDB ObjectId)
 * Admin: A-XXXX
 * Health Counselor: HC-XXXX
 */
export function formatUserId(id: string, role?: string): string {
  if (!id) return '';
  const shortId = id.slice(0, 4).toUpperCase();
  
  switch (role?.toLowerCase()) {
    case 'dietitian':
      return `Dt-${shortId}`;
    case 'client':
      return `C-${shortId}`;
    case 'admin':
      return `A-${shortId}`;
    case 'health_counselor':
      return `HC-${shortId}`;
    default:
      return `U-${shortId}`;
  }
}

/**
 * Get dietitian display ID (Dt-XXXX format)
 */
export function getDietitianId(id: string): string {
  if (!id) return '';
  return `Dt-${id.slice(0, 4).toUpperCase()}`;
}

/**
 * Get client display ID (C-XXXX format)
 */
export function getClientId(id: string): string {
  if (!id) return '';
  return `C-${id.slice(0, 4).toUpperCase()}`;
}

/**
 * Get health counselor display ID (HC-XXXX format)
 */
export function getHealthCounselorId(id: string): string {
  if (!id) return '';
  return `HC-${id.slice(0, 4).toUpperCase()}`;
}
