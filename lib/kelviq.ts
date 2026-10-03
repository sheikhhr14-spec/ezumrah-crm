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
  planProfessional: string;
  planEnterprise: string;
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
    planProfessional: s.kelviq_plan_professional || 'professional',
    planEnterprise: s.kelviq_plan_enterprise || 'enterprise',
  };
}

export function kelviqBaseUrl(env: KelviqEnv) {
  return env === 'production' ? 'https://api.kelviq.com/api/v1' : 'https://sandboxapi.kelviq.com/api/v1';
}

/** Plan identifier in Kelviq for an internal plan id */
export function kelviqPlanId(cfg: KelviqConfig, plan: string) {
  return plan === 'enterprise' ? cfg.planEnterprise : cfg.planProfessional;
}

/** Reverse map: Kelviq planIdentifier -> internal plan id ('professional' default) */
export function internalPlanFromKelviq(cfg: KelviqConfig, planIdentifier?: string | null) {
  if (!planIdentifier) return null;
  if (planIdentifier === cfg.planEnterprise && planIdentifier !== cfg.planProfessional) return 'enterprise';
  return 'professional';
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
