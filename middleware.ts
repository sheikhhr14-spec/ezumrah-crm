import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Graceful degradation: if env vars are missing, bounce to /login instead
  // of throwing (prevents MIDDLEWARE_INVOCATION_FAILED 500s on Vercel).
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    const target = request.nextUrl.clone();
    target.pathname = '/login';
    target.searchParams.set('env', 'missing');
    return NextResponse.redirect(target);
  }

  try {
    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          } catch {
            // called from a Server Component — safe to ignore
          }
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const target = request.nextUrl.clone();
      target.pathname = '/login';
      return NextResponse.redirect(target);
    }
    return response;
  } catch (err) {
    console.error('middleware error:', err);
    const target = request.nextUrl.clone();
    target.pathname = '/login';
    target.searchParams.set('env', 'error');
    return NextResponse.redirect(target);
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
