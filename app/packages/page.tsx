import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';

export const metadata = {
  title: 'Find Umrah & Hajj Packages — Compare Verified Agency Offers | EzUmrah',
  description:
    'Browse Umrah and Hajj packages from verified travel agencies worldwide. Compare prices, duration and inclusions, then enquire directly — the agency receives your request instantly.',
  keywords: ['Umrah packages', 'Hajj packages', 'Umrah package price', 'Hajj 2026 packages', 'Umrah December package', 'Umrah package from Pakistan', 'Umrah package from UK', 'Umrah package from UAE', 'cheap Umrah packages', 'luxury Umrah packages'],
  openGraph: {
    title: 'Find Umrah & Hajj Packages — Verified Agencies',
    description: 'Compare Umrah and Hajj packages from verified agencies worldwide.',
    type: 'website',
  },
};

const TYPE_STYLE: Record<string, string> = {
  umrah: 'bg-gold/10 accent', hajj: 'bg-emerald-50 text-emerald-700', ziyarah: 'bg-sky-50 text-sky-700',
  hotel: 'bg-slate-100 text-slate-600', flight: 'bg-slate-100 text-slate-600', transport: 'bg-slate-100 text-slate-600', holiday: 'bg-slate-100 text-slate-600',
};

export default async function PublicPackagesPage({ searchParams }: { searchParams?: { type?: string; error?: string } }) {
  const db = createAdminClient();
  const { data: packages } = await db.from('packages')
    .select('id, name, service_type, duration_days, description, price_from, currency, created_at, agencies(name, logo_url, country, contact_phone)')
    .eq('is_public', true).eq('is_active', true)
    .order('created_at', { ascending: false }).limit(200);
  const list = (packages || []).filter((p: any) => !searchParams?.type || p.service_type === searchParams.type);
  const types = ['umrah', 'hajj', 'ziyarah'];

  return (
    <main className="min-h-screen bg-[#faf7f0] text-slate-900">
      <nav className="sticky top-0 z-50 border-b border-gold/10 bg-white/70 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-bold"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold text-lg text-white">E</span>EzUmrah</Link>
          <div className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <a href="/#modules" className="hover:text-gold">Modules</a>
            <a href="/packages" className="text-gold">Find Packages</a>
            <a href="/#pricing" className="hover:text-gold">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-slate-700 hover:text-gold">Sign in</Link>
            <Link href="/signup" className="btn-primary text-sm">Get started</Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-12">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold md:text-5xl">Find Umrah & Hajj packages</h1>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            Real packages from verified agencies using EzUmrah CRM. Enquire directly — your request goes straight to the agency, no middlemen.
          </p>
        </div>
        <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
          <Link href="/packages" className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${!searchParams?.type ? 'border-gold bg-gold/10 accent' : 'border-slate-200 text-slate-600 hover:border-gold'}`}>All</Link>
          {types.map((t) => (
            <Link key={t} href={`/packages?type=${t}`} className={`rounded-full border px-4 py-1.5 text-sm font-semibold capitalize ${searchParams?.type === t ? 'border-gold bg-gold/10 accent' : 'border-slate-200 text-slate-600 hover:border-gold'}`}>{t}</Link>
          ))}
        </div>

        {searchParams?.error === 'notfound' && <p className="mb-6 rounded-lg bg-red-50 p-3 text-center text-sm text-red-600">That package is no longer available.</p>}

        {list.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((p: any) => {
              const cur = p.currency || 'USD';
              const price = p.price_from ? `${cur} ${Number(p.price_from).toLocaleString()}` : 'On request';
              return (
                <Link key={p.id} href={`/packages/${p.id}`} className="card group border-gold/20 p-6 transition hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-lg">
                  <div className="mb-3 flex items-center justify-between">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TYPE_STYLE[p.service_type] || 'bg-slate-100 text-slate-600'}`}>{p.service_type}</span>
                    {p.duration_days ? <span className="text-xs text-slate-400">{p.duration_days} days</span> : null}
                  </div>
                  <h2 className="text-lg font-bold group-hover:accent">{p.name}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{p.description || 'Contact the agency for full details and inclusions.'}</p>
                  <div className="mt-4 flex items-end justify-between">
                    <div className="flex items-center gap-2">
                      {p.agencies?.logo_url ? (
                        <img src={p.agencies.logo_url} alt={p.agencies.name} className="h-7 w-7 rounded-md object-cover" />
                      ) : (
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gold/10 text-xs font-bold accent">{(p.agencies?.name || 'A').charAt(0)}</span>
                      )}
                      <div>
                        <p className="text-xs font-semibold text-slate-700">{p.agencies?.name || 'Verified agency'}</p>
                        {p.agencies?.country && <p className="text-[10px] text-slate-400">{p.agencies.country}</p>}
                      </div>
                    </div>
                    <p className="text-lg font-extrabold accent">{price}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="card mx-auto max-w-lg p-10 text-center">
            <p className="text-4xl">🕋</p>
            <h2 className="mt-3 text-xl font-bold">No public packages yet</h2>
            <p className="mt-2 text-sm text-slate-500">Agencies are just starting to publish. Run an agency? Your packages can appear here free — powered by EzUmrah CRM.</p>
            <Link href="/signup" className="btn-primary mt-5 inline-block">Publish your packages</Link>
          </div>
        )}
      </section>

      <footer className="border-t border-gold/10 bg-white/60 py-8 text-center text-sm text-slate-500 backdrop-blur">
        <p>Package enquiries go directly to the agencies — EzUmrah never charges customers a commission.</p>
        <p className="mt-2">© {new Date().getFullYear()} EzUmrah. All rights reserved.</p>
      </footer>
    </main>
  );
}
