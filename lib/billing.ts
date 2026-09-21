// Subscription plans shown at signup / billing
export const PLANS = {
  starter: {
    name: 'Starter',
    price_monthly: 29,
    features: ['All sales modules', 'Bookings calendar', 'Invoices & documents', 'Up to 3 staff', 'Email support'],
  },
  professional: {
    name: 'Professional',
    price_monthly: 79,
    features: ['Everything in Starter', 'Quotations, reports & accounts', 'Unlimited staff', 'Priority support'],
  },
  enterprise: {
    name: 'Enterprise',
    price_monthly: 199,
    features: ['Everything in Professional', 'HR suite & credential vault', 'Multi-branch', 'Dedicated manager'],
  },
} as const;

export type PlanId = keyof typeof PLANS;
export const PLAN_IDS = Object.keys(PLANS) as PlanId[];
