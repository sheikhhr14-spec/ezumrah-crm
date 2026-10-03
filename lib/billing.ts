// Subscription plans shown at signup / billing
export const PLANS = {
  standard: {
    name: 'Standard',
    price_monthly: 100,
    users_included: 2,
    extra_user_price: 50,
    features: [
      'Flight, hotel, visa & transport sales',
      'Umrah, Hajj & tour package sales',
      'Leads, customers, bookings & calendar',
      'Documents, tasks & ticket system',
      'Invoices, quotations & reports',
      'Agency branding & colors',
      '2 users included — +$50 per extra user',
    ],
  },
  professional: {
    name: 'Professional',
    price_monthly: 200,
    users_included: 5,
    extra_user_price: 50,
    features: [
      'Everything in Standard',
      'HR & payroll + team chat',
      'Accounts module',
      'Public package showcase & website leads',
      'Agency SMTP email delivery',
      '5 users included — +$50 per extra user',
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
