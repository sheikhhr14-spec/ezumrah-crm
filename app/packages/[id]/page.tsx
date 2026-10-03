import { createAdminClient } from '@/lib/supabase/admin';
import { submitPackageEnquiry } from '@/lib/crm-actions';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

async function getPackage(id: string) {
  const db = createAdminClient();
  const { data } = await db.from('packages')
    .select('id, name, service_type, duration_days, description, price_from, currency, created_at, agencies(name, logo_url, country, contact_phone, website)')
    .eq('id', id).eq('is_public', true).eq('is_active', true).single();
  return data;
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const pkg: any = await getPackage(params.id);
  if (!pkg) return { title: 'Package not found | EzUmrah' };
  const title = `${pkg.name} — ${pkg.duration_days ? pkg.duration_days + '-day ' : ''}${pkg.service_type} package${pkg.agencies?.name ? ' by ' + pkg.agencies.name : ''} | EzUmrah`;
  return {
    title,
    description: (pkg.description || `Book the ${pkg.name} ${pkg.service_type} package through ${pkg.agencies?.name || 'a verified agency'}. ${pkg.price_from ? 'From ' + (pkg.currency || 'USD') + ' ' + pkg.price_from + '.' : ''}`).slice(0, 160),
    openGraph: { title, type: 'article' },
  };
}

export default async function PublicPackageDetail({ params, searchParams }: { params: { id: string }; searchParams?: { sent?: string; error?: string } }) {
  const pkg: any = await getPackage(params.id);
  if (!pkg) notFound();
  const cur = pkg.currency || 'USD';
  const price = pkg.price_from ? `${cur} ${Number(pkg.price_from).toLocaleString()}` : 'Price on request';

  return (
    <main className="min-h-screen bg-[#faf7f0] text-slate-900">
      <nav className="sticky top-0 z-50 border-b border-gold/10 bg-white/70 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-bold"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold text-lg text-white">E</span>EzUmrah</Link>
          <Link href="/packages" className="text-sm font-semibold accent hover:underline">← All packages</Link>
        </div>
      </nav>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Product',
        name: pkg.name, description: pkg.description || pkg.name,
        ...(pkg.price_from ? { offers: { '@type': 'Offer', price: String(pkg.price_from), priceCurrency: cur, availability: 'https://schema.org/InStock' } } : {}),
        seller: { '@type': 'Organization', name: pkg.agencies?.name || 'Verified agency' },
      }) }} />

      <section className="mx-auto max-w-5xl px-4 pb-16 pt-10">
        <div className="grid gap-8 md:grid-cols-[1.3fr_1fr]">
          <div>
            <span className="inline-block rounded-full bg-gold/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide accent">{pkg.service_type}</span>
            <h1 className="mt-3 text-3xl font-extrabold md:text-4xl">{pkg.name}</h1>
            <div className="mt-3 flex items-center gap-3">
              {pkg.agencies?.logo_url ? (
                <img src={pkg.agencies.logo_url} alt={pkg.agencies.name} className="h-9 w-9 rounded-lg object-cover" />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/10 font-bold accent">{(pkg.agencies?.name || 'A').charAt(0)}</span>
              )}
              <div>
                <p className="text-sm font-bold">{pkg.agencies?.name || 'Verified agency'}</p>
                {pkg.agencies?.country && <p className="text-xs text-slate-400">{pkg.agencies.country}</p>}
              </div>
            </div>
            <div className="card mt-6 border-gold/20 p-6">
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-400">Package details</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <div><p className="text-xs text-slate-400">Duration</p><p className="font-bold">{pkg.duration_days ? `${pkg.duration_days} days` : '—'}</p></div>
                <div><p className="text-xs text-slate-400">Price from</p><p className="font-bold accent">{price}</p></div>
                <div><p className="text-xs text-slate-400">Category</p><p className="font-bold capitalize">{pkg.service_type}</p></div>
              </div>
              {pkg.description && <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{pkg.description}</p>}
            </div>
          </div>

          <div className="card h-fit border-gold/40 p-6 shadow-lg">
            {searchParams?.sent === '1' ? (
              <div className="py-8 text-center">
                <p className="text-4xl">✅</p>
                <h2 className="mt-3 text-lg font-bold">Enquiry sent!</h2>
                <p className="mt-2 text-sm text-slate-500">{pkg.agencies?.name || 'The agency'} received your request and will contact you soon. It was also saved in their CRM as a lead.</p>
                <Link href="/packages" className="btn-secondary mt-5 inline-block">Browse more packages</Link>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-bold">Enquire about this package</h2>
                <p className="mt-1 text-xs text-slate-400">Goes directly to {pkg.agencies?.name || 'the agency'} — no middlemen, no fees.</p>
                {searchParams?.error === 'missing' && <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs font-semibold text-red-600">Please add your name and a phone or email.</p>}
                <form action={submitPackageEnquiry} className="mt-4 space-y-3">
                  <input type="hidden" name="package_id" value={pkg.id} />
                  <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />
                  <input className="input" name="full_name" required placeholder="Your name *" />
                  <div className="grid grid-cols-2 gap-3">
                    <input className="input" name="phone" placeholder="Phone" />
                    <input className="input" name="whatsapp" placeholder="WhatsApp" />
                  </div>
                  <input className="input" name="email" type="email" placeholder="Email" />
                  <input className="input" name="country" placeholder="Country" />
                  <textarea className="input min-h-20" name="message" placeholder="Travel dates, number of travellers, special requests…" />
                  <button className="btn-primary w-full" type="submit">Send enquiry</button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-gold/10 bg-white/60 py-8 text-center text-sm text-slate-500 backdrop-blur">
        <p>© {new Date().getFullYear()} EzUmrah. All rights reserved.</p>
      </footer>
    </main>
  );
}
