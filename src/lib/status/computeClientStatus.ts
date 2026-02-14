import { ClientStatus } from '@/types';

/**
 * Centralized, single-source-of-truth client status computation.
 *
 * Rules:
 *   LEAD     → Registered but no successful payment yet.
 *   ACTIVE   → Has at least one successful payment AND a currently valid (non-expired) plan.
 *   INACTIVE → Has paid in the past, but all plans are expired or inactive.
 *
 * This function is **pure** — it does NOT touch the database. Callers are
 * responsible for fetching the required data and persisting the result.
 */
export interface StatusInput {
  /** Whether the client has at least one successful (paid/completed) payment */
  hasSuccessfulPayment: boolean;
  /** The active meal plan (if any) with start/end dates and status */
  activePlan?: {
    startDate: Date | string;
    endDate: Date | string;
    status: string; // 'active' | 'completed' | 'paused' | 'cancelled'
  } | null;
}

export function computeClientStatus(input: StatusInput): ClientStatus {
  const { hasSuccessfulPayment, activePlan } = input;

  // Rule 1: No successful payment → LEAD
  if (!hasSuccessfulPayment) {
    return ClientStatus.LEAD;
  }

  // Rule 2: Has payment. Check if there is a currently valid plan.
  if (activePlan) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(activePlan.endDate);
    endDate.setHours(23, 59, 59, 999);

    const startDate = new Date(activePlan.startDate);
    startDate.setHours(0, 0, 0, 0);

    if (
      activePlan.status === 'active' &&
      startDate <= today &&
      endDate >= today
    ) {
      return ClientStatus.ACTIVE;
    }
  }

  // Rule 3: Has paid, but no valid active plan → INACTIVE
  return ClientStatus.INACTIVE;
}

/**
 * Helper to compute client status from raw database documents.
 *
 * @param payments - Array of payment documents (need at least `status` and `paymentStatus` fields)
 * @param mealPlans - Array of meal plan documents (need `startDate`, `endDate`, `status`)
 * @returns The computed ClientStatus
 */
export function computeClientStatusFromDocs(
  payments: Array<{ status?: string; paymentStatus?: string }>,
  mealPlans: Array<{ startDate: Date | string; endDate: Date | string; status: string }>
): ClientStatus {
  // Check for any successful payment
  const hasSuccessfulPayment = payments.some(
    p =>
      p.status === 'paid' ||
      p.status === 'completed' ||
      p.status === 'active' ||
      p.paymentStatus === 'paid'
  );

  // Find the currently active plan (if any)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activePlan = mealPlans.find(plan => {
    const start = new Date(plan.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(plan.endDate);
    end.setHours(23, 59, 59, 999);

    return plan.status === 'active' && start <= today && end >= today;
  }) || null;

  
  return computeClientStatus({ hasSuccessfulPayment, activePlan });
}

