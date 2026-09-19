import { NextResponse } from 'next/server';

// Diagnostics only — reports presence of env vars, never their values.
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    env: {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      NEXT_PUBLIC_APP_URL: !!process.env.NEXT_PUBLIC_APP_URL,
      STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
    },
  });
}
