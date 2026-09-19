// EzUmrah CRM — Supabase clients

import { createBrowserClient } from '@supabase/ssr';

// Browser client (anon key, respects RLS) — used for auth
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
