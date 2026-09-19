// Subscription plans shown at signup / billing
export const PLANS = {
  starter: {
    name: 'Starter',
    price_monthly: 29,
    features: ['Up to 3 staff', '500 bookings', 'Invoicing & quotations', 'Document vault'],
  },
  professional: {
    name: 'Professional',
    price_monthly: 79,
    features: ['Unlimited staff', 'Unlimited bookings', 'All 9 modules', 'Priority support'],
  },
  enterprise: {
    name: 'Enterprise',
    price_monthly: 199,
    features: ['Everything in Professional', 'Multi-branch', 'API access', 'Dedicated manager'],
  },
} as const;

export type PlanId = keyof typeof PLANS;
export const PLAN_IDS = Object.keys(PLANS) as PlanId[];
