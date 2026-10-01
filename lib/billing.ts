// Subscription plans shown at signup / billing
export const PLANS = {
  professional: {
    name: 'Professional',
    price_monthly: 100,
    users_included: 2,
    extra_user_price: 50,
    features: [
      'All sales & operations modules',
      'HR & payroll + team chat',
      'Quotations, reports & accounts',
      'Built-in support ticket system',
      'Agency branding & own SMTP',
      '2 users included — +$50 per extra user',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    price_monthly: null, // custom pricing — contact sales
    users_included: null, // unlimited
    extra_user_price: 0,
    features: [
      'Everything in Professional',
      'Nusuk Umrah visa integration',
      'White-labeling — your domain & brand',
      'GDS integration (Amadeus / Sabre)',
      'Full API access',
      'Unlimited users',
      'Dedicated manager',
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;
export const PLAN_IDS = Object.keys(PLANS) as PlanId[];

export function planPriceLabel(id: PlanId): string {
  const p = PLANS[id];
  return p.price_monthly === null ? 'Custom' : `$${p.price_monthly}/month`;
}
