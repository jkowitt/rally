/**
 * Usage tracking and plan-based limits for property record lookups.
 *
 * Each plan has a monthly quota of property record (RentCast) requests.
 * After the quota is exhausted, each additional request costs $2
 * and is billed automatically via Stripe.
 */

import { prisma } from '@/lib/prisma';

// Monthly property-record lookup limits per plan
export const PLAN_LIMITS: Record<string, number> = {
  FREE: 0,       // Free / beta accounts — no RentCast lookups (must upgrade)
  STARTER: 25,
  PROFESSIONAL: 100,
  ENTERPRISE: 500,
  BETA: 0,       // Beta users — no lookups until they register and pay
  OWNER: Infinity, // Site owner/developer — unlimited, no billing
};

// Plans that are considered "paid" and can access RentCast lookups
const PAID_PLANS = new Set(['STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'OWNER']);

/**
 * Check if a user has a paid plan that allows RentCast / property-record / comp lookups.
 * Beta and free users are blocked — they can only use AI photo analysis.
 */
export async function hasPaidAccess(userId: string): Promise<{ allowed: boolean; plan: string }> {
  const plan = await getUserPlan(userId);
  return { allowed: PAID_PLANS.has(plan), plan };
}

export const OVERAGE_PRICE_CENTS = 200; // $2.00 per additional request

const USAGE_ACTION = 'property_record_lookup';

/**
 * Get the current billing period boundaries for a user.
 * Uses the Subscription period if available, otherwise calendar month.
 */
async function getBillingPeriod(userId: string): Promise<{ start: Date; end: Date }> {
  const subscription = await prisma.subscription.findFirst({
    where: { userId, platform: 'VALORA', status: 'ACTIVE' },
    select: { currentPeriodStart: true, currentPeriodEnd: true },
  });

  if (subscription) {
    return {
      start: subscription.currentPeriodStart,
      end: subscription.currentPeriodEnd,
    };
  }

  // Fallback: calendar month
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

/**
 * Get the user's current plan type.
 * SUPER_ADMIN users (site owner/developer) get the OWNER plan — unlimited, no billing.
 */
async function getUserPlan(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (user?.role === 'SUPER_ADMIN') return 'OWNER';

  const subscription = await prisma.subscription.findFirst({
    where: { userId, platform: 'VALORA', status: 'ACTIVE' },
    select: { planType: true },
  });
  return subscription?.planType || 'BETA';
}

/**
 * Count how many property record lookups the user has made this billing period.
 */
async function getUsageCount(userId: string, periodStart: Date, periodEnd: Date): Promise<number> {
  return prisma.activityLog.count({
    where: {
      userId,
      action: USAGE_ACTION,
      createdAt: { gte: periodStart, lt: periodEnd },
    },
  });
}

/**
 * Get the user's full usage status for property record lookups.
 */
export async function getPropertyRecordUsage(userId: string): Promise<{
  used: number;
  limit: number;
  plan: string;
  remaining: number;
  overageCount: number;
  overageCostCents: number;
  periodStart: string;
  periodEnd: string;
}> {
  const plan = await getUserPlan(userId);
  const { start, end } = await getBillingPeriod(userId);
  const used = await getUsageCount(userId, start, end);
  const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.FREE;
  const remaining = Math.max(0, limit - used);
  const overageCount = Math.max(0, used - limit);

  return {
    used,
    limit,
    plan,
    remaining,
    overageCount,
    overageCostCents: overageCount * OVERAGE_PRICE_CENTS,
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
  };
}

/**
 * Check if the user can make a property record request.
 * Returns { allowed, usage, willBeOverage }.
 */
export async function checkPropertyRecordAccess(userId: string): Promise<{
  allowed: boolean;
  willBeOverage: boolean;
  usage: Awaited<ReturnType<typeof getPropertyRecordUsage>>;
}> {
  const usage = await getPropertyRecordUsage(userId);

  // Always allow — but flag if it's an overage ($2 charge)
  return {
    allowed: true,
    willBeOverage: usage.remaining <= 0,
    usage,
  };
}

/**
 * Record a property record lookup in the activity log.
 */
export async function recordPropertyRecordUsage(
  userId: string,
  details: { address: string; source: string; wasOverage: boolean }
): Promise<void> {
  await prisma.activityLog.create({
    data: {
      userId,
      action: USAGE_ACTION,
      entityType: 'property_record',
      entityId: `pr_${Date.now()}`,
      details: {
        address: details.address,
        source: details.source,
        wasOverage: details.wasOverage,
        overageCharge: details.wasOverage ? OVERAGE_PRICE_CENTS : 0,
        timestamp: new Date().toISOString(),
      },
    },
  });
}
