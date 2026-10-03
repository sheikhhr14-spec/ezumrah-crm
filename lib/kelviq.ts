// Kelviq — Merchant of Record platform (kelviq.com) used to sell EzUmrah CRM
// subscriptions. Credentials are managed by the super-admin in
// /admin/settings and stored in platform settings (storage bucket), with
// environment variables as fallback.
// API docs: https://docs.kelviq.com

import crypto from 'crypto';
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
  const enabled = s.kelviq_enabled === true;
  const env: KelviqEnv = s.kelviq_env === 'production' ? 'production' : 'sandbox';
  return {
    enabled,
    env,
    serverKey: s.kelviq_server_key || process.env.KELVIQ_SERVER_API_KEY || '',
    webhookSecret: s.kelviq_webhook_secret || process.env.KELVIQ_WEBHOOK_SECRET || '',
    planStandard: s.kelviq_plan_standard || 'standard',
    planProfessional: s.kelviq_plan_professional || 'professional',
    planEnterprise: s.kelviq_plan_enterprise || 'enterprise',
    checkoutUrl: s.kelviq_checkout_url || '',
  };
}

export function kelviqBaseUrl(env: KelviqEnv) {
  return env === 'production' ? 'https://api.kelviq.com/api/v1' : 'https://sandboxapi.kelviq.com/api/v1';
}

/** Plan identifier in Kelviq for an internal plan id */
export function kelviqPlanId(cfg: KelviqConfig, plan: string) {
  if (plan === 'enterprise') return cfg.planEnterprise;
  if (plan === 'professional') return cfg.planProfessional;
  return cfg.planStandard;
}

/** Reverse map: Kelviq planIdentifier -> internal plan id ('professional' default) */
export function internalPlanFromKelviq(cfg: KelviqConfig, planIdentifier?: string | null) {
  if (!planIdentifier) return null;
  if (planIdentifier === cfg.planEnterprise) return 'enterprise';
  if (planIdentifier === cfg.planProfessional) return 'professional';
  return 'standard';
}

/**
 * Creates a hosted checkout session. The customer is auto-created in Kelviq
 * with our agency_id as their customerId, so webhook events can be correlated.
 */
export async function createKelviqCheckoutSession(cfg: KelviqConfig, opts: {
  plan: string;
  agencyId: string;
  email?: string;
  name?: string;
  successUrl: string;
}): Promise<{ checkoutUrl: string; checkoutSessionId: string }> {
  const res = await fetch(`${kelviqBaseUrl(cfg.env)}/checkout/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.serverKey}`,
    },
    body: JSON.stringify({
      planIdentifier: kelviqPlanId(cfg, opts.plan),
      chargePeriod: 'MONTHLY',
      customerId: opts.agencyId,
      ...(opts.email ? { email: opts.email } : {}),
      ...(opts.name ? { name: opts.name } : {}),
      successUrl: opts.successUrl,
      metadata: {
        agency_id: opts.agencyId,
        plan: opts.plan,
        source: 'ezumrah_crm',
      },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.checkoutUrl) {
    throw new Error(data?.message || data?.error || `Kelviq checkout failed (${res.status})`);
  }
  return { checkoutUrl: data.checkoutUrl, checkoutSessionId: data.checkoutSessionId || '' };
}

/**
 * Verifies a Kelviq webhook delivery (Standard Webhooks scheme).
 * Headers: webhook-id, webhook-timestamp, webhook-signature ("v1,<base64 hmac>").
 * Signature = base64(HMAC-SHA256(secret, `${timestamp}.${rawBody}`)).
 */
export function verifyKelviqSignature(rawBody: string, signature: string | null, timestamp: string | null, secret: string): boolean {
  if (!signature || !timestamp || !secret) return false;
  const m = signature.match(/^v1,(.+)$/);
  if (!m) return false;
  // reject deliveries older than 10 minutes
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 600) return false;
  const given = Buffer.from(m[1], 'base64');
  const key = Buffer.from(secret.replace(/^kq_whsec_/, ''), 'base64');
  const expected = crypto.createHmac('sha256', key).update(`${timestamp}.${rawBody}`).digest();
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

/** Lists subscriptions for a Kelviq customer (docs: GET /subscriptions/?customer_id=) */
export async function listKelviqSubscriptions(cfg: KelviqConfig, customerId: string): Promise<any[]> {
  const res = await fetch(`${kelviqBaseUrl(cfg.env)}/subscriptions/?customer_id=${encodeURIComponent(customerId)}`, {
    headers: { Authorization: `Bearer ${cfg.serverKey}` },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({}));
  return Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
}

/** Finds a Kelviq customer record by email (docs: GET /customers/?search=) */
export async function findKelviqCustomerByEmail(cfg: KelviqConfig, email: string): Promise<any | null> {
  const res = await fetch(`${kelviqBaseUrl(cfg.env)}/customers/?search=${encodeURIComponent(email)}&page_size=5`, {
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
 * subscription in Kelviq — first by our customerId (= agency_id, used on
 * API-created checkouts), then by the owner's email (static checkout link
 * buyers). Returns the active subscription and the matched customerId.
 */
export async function resolveKelviqSubscription(cfg: KelviqConfig, agencyId: string, email?: string | null) {
  const active = (subs: any[]) => subs.find((s) => s.status === 'active' || s.status === 'trialing') || null;
  const viaAgency = await listKelviqSubscriptions(cfg, agencyId);
  const found = active(viaAgency);
  if (found) return { subscription: found, customerId: agencyId };
  if (email) {
    const cust = await findKelviqCustomerByEmail(cfg, email);
    const custId = cust?.customerId || cust?.id;
    if (custId) {
      const subs = await listKelviqSubscriptions(cfg, custId);
      const f = active(subs);
      if (f) return { subscription: f, customerId: custId };
    }
  }
  return { subscription: null, customerId: null };
}
