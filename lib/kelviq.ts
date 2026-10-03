// Kelviq — Merchant of Record platform (kelviq.com) used to sell EzUmrah CRM
// subscriptions. Server-side only, via the official @kelviq/node-sdk.
// Credentials: environment variables first (sandbox/CI), then the super-admin
// card in /admin/settings (stored in platform settings bucket).
// API docs: https://docs.kelviq.com  ·  SDK: https://docs.kelviq.com/backend-integration/node-sdk.md

import { Kelviq, environmentFromEnv, validateEvent, ApiError } from '@kelviq/node-sdk';
import { getPlatformSettings } from '@/lib/platform-settings';

export type KelviqEnv = 'sandbox' | 'production';

export type KelviqConfig = {
  enabled: boolean;
  env: KelviqEnv;
  serverKey: string;
  webhookSecret: string;
  planStandard: string;
  planProfessional: string;
  planEnterprise: string;
  checkoutUrl?: string; // static checkout link (fallback when session API fails)
};

export async function getKelviqConfig(): Promise<KelviqConfig> {
  const s = await getPlatformSettings();
  // Environment variables win over the admin card: pasting the sandbox block
  // from app.kelviq.com/settings/setup-with-ai into .env.local flips the whole
  // app onto the sandbox without touching production settings.
  const envKey = (process.env.KELVIQ_SERVER_API_KEY || '').trim();
  const env: KelviqEnv = envKey
    ? environmentFromEnv(process.env.KELVIQ_ENV) // sandbox when KELVIQ_ENV is unset
    : s.kelviq_env === 'production'
      ? 'production'
      : 'sandbox';
  return {
    enabled: s.kelviq_enabled === true,
    env,
    serverKey: envKey || s.kelviq_server_key || '',
    webhookSecret: (process.env.KELVIQ_WEBHOOK_SECRET || '').trim() || s.kelviq_webhook_secret || '',
    planStandard: s.kelviq_plan_standard || 'standard',
    planProfessional: s.kelviq_plan_professional || 'professional',
    planEnterprise: s.kelviq_plan_enterprise || 'enterprise',
    checkoutUrl: s.kelviq_checkout_url || '',
  };
}

/** One shared SDK client per call, keyed to the resolved environment. */
export async function getKelviqClient(cfg?: KelviqConfig): Promise<Kelviq> {
  const c = cfg || (await getKelviqConfig());
  if (!c.serverKey) throw new Error('Kelviq is not configured (missing API key)');
  return new Kelviq({ accessToken: c.serverKey, environment: c.env, logger: false });
}

/** Plan identifier in Kelviq for an internal plan id */
export function kelviqPlanId(cfg: KelviqConfig, plan: string) {
  if (plan === 'enterprise') return cfg.planEnterprise;
  if (plan === 'professional') return cfg.planProfessional;
  return cfg.planStandard;
}

/** Reverse map: Kelviq planIdentifier -> internal plan id */
export function internalPlanFromKelviq(cfg: KelviqConfig, planIdentifier?: string | null) {
  if (!planIdentifier) return null;
  if (planIdentifier === cfg.planEnterprise) return 'enterprise';
  if (planIdentifier === cfg.planProfessional) return 'professional';
  return 'standard';
}

/**
 * Ensures the Kelviq customer exists with an email — the billing portal
 * returns 400 until it does. We use the agency id as customerId, so we create
 * the record ourselves before checkout; ignore "already exists" and refresh
 * the email instead.
 */
export async function ensureKelviqCustomer(client: Kelviq, customerId: string, email?: string, name?: string) {
  const params = {
    customerId,
    email: email || null,
    name: name || null,
    metadata: { agency_id: customerId, source: 'ezumrah_crm' },
  };
  try {
    await client.customers.create(params);
  } catch (e: any) {
    if (e instanceof ApiError && (e.statusCode === 400 || e.statusCode === 409)) {
      try { await client.customers.update(params); } catch { /* keep record as-is */ }
    } else {
      throw e;
    }
  }
}

/**
 * Creates a hosted checkout session for an allowed plan, monthly only.
 * The customer record is created first (with the owner's email) so that
 * portal sessions and webhook correlation both work from day one.
 */
export async function createKelviqCheckoutSession(cfg: KelviqConfig, opts: {
  plan: string;
  agencyId: string; // Kelviq customerId — the tenant the subscription belongs to
  email?: string;
  name?: string;
  successUrl: string; // absolute
  trialDays?: number | null; // while the agency is on its 5-day trial, Kelviq charges when it ends
}): Promise<{ checkoutUrl: string; checkoutSessionId: string }> {
  const client = await getKelviqClient(cfg);
  await ensureKelviqCustomer(client, opts.agencyId, opts.email, opts.name);
  const session = await client.checkout.createSession({
    planIdentifier: kelviqPlanId(cfg, opts.plan),
    chargePeriod: 'MONTHLY',
    customerId: opts.agencyId,
    successUrl: opts.successUrl,
    ...(opts.trialDays ? { trialPeriod: opts.trialDays } : {}),
  });
  return { checkoutUrl: session.checkoutUrl, checkoutSessionId: session.checkoutSessionId };
}

/**
 * Verifies a Kelviq webhook delivery using the SDK's Standard Webhooks
 * verification. Returns the parsed event, or null when the signature is
 * invalid (caller must answer 403).
 */
export function verifyKelviqEvent(
  rawBody: string,
  headers: Record<string, string | string[] | undefined>,
  secret: string,
): Record<string, unknown> | null {
  if (!secret) return null;
  try {
    return validateEvent(rawBody, headers, secret);
  } catch {
    return null;
  }
}

/** Lists subscriptions for a Kelviq customer (SDK camelCase shapes). */
export async function listKelviqSubscriptions(client: Kelviq, customerId: string) {
  const res = await client.subscriptions.list({ customerId, pageSize: 50 });
  return res.results || [];
}

/**
 * Finds a Kelviq customer record by email (GET /customers/?search=) —
 * the SDK customer list has no search param, so raw HTTP here only.
 */
export async function findKelviqCustomerByEmail(cfg: KelviqConfig, email: string): Promise<any | null> {
  const base = cfg.env === 'production' ? 'https://api.kelviq.com/api/v1' : 'https://sandboxapi.kelviq.com/api/v1';
  const res = await fetch(`${base}/customers/?search=${encodeURIComponent(email)}&page_size=5`, {
    headers: { Authorization: `Bearer ${cfg.serverKey}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  const exact = (data?.results || []).find((c: any) => (c.email || '').toLowerCase() === email.toLowerCase());
  return exact || (data?.results || [])[0] || null;
}

/**
 * Direct verification (no webhooks needed): finds the agency's active
 * subscription in Kelviq — first by our customerId (= agency_id), then by the
 * owner's email (static checkout link buyers). Returns the active
 * subscription (SDK SubscriptionData) and the matched customerId.
 */
export async function resolveKelviqSubscription(cfg: KelviqConfig, agencyId: string, email?: string | null) {
  const active = (subs: any[]) => subs.find((s) => s.status === 'active' || s.status === 'trialing') || null;
  const client = await getKelviqClient(cfg);
  const viaAgency = await listKelviqSubscriptions(client, agencyId);
  const found = active(viaAgency);
  if (found) return { subscription: found, customerId: agencyId };
  if (email) {
    const cust = await findKelviqCustomerByEmail(cfg, email);
    const custId = cust?.customerId || cust?.id;
    if (custId) {
      const subs = await listKelviqSubscriptions(client, custId);
      const f = active(subs);
      if (f) return { subscription: f, customerId: custId };
    }
  }
  return { subscription: null, customerId: null };
}

/**
 * Entitlement check via the Kelviq Edge API. Fails CLOSED on error: a
 * customer with no subscription (or an outage) gets false. Not wired into any
 * gate yet — say where to apply it (suggested: the Nusuk integration).
 */
export async function hasFeature(customerId: string, featureId: string): Promise<boolean> {
  try {
    const client = await getKelviqClient();
    return await client.entitlements.hasAccess({ customerId, featureId });
  } catch (e) {
    console.error('kelviq: entitlement check failed, failing closed', e instanceof Error ? e.message : e);
    return false;
  }
}
