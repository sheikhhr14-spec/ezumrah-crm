import Link from 'next/link';
import { PLANS, PLAN_IDS } from '@/lib/billing';

export const metadata = {
  title: 'EzUmrah CRM — Umrah & Hajj Travel Agency Management Software',
  description:
    'All-in-one CRM for Umrah and Hajj travel agencies worldwide: flight, hotel, visa, transport and ziyarat sales, packages, bookings calendar, leads, invoicing, documents, reports and multi-branch management.',
  keywords: [
    'Umrah CRM', 'Hajj CRM', 'Umrah travel agency software', 'Hajj operator software', 'Umrah booking system',
    'Saudi Arabia', 'UAE', 'Pakistan', 'India', 'Bangladesh', 'Indonesia', 'Malaysia', 'Turkey', 'Egypt',
    'United Kingdom', 'USA', 'Canada', 'Australia', 'Germany', 'France', 'Netherlands', 'Spain', 'Italy',
    'Kuwait', 'Qatar', 'Bahrain', 'Oman', 'Jordan', 'Morocco', 'Algeria', 'Tunisia', 'Nigeria', 'Kenya',
    'South Africa', 'Sri Lanka', 'Philippines', 'Umrah visa management', 'Hajj group management',
  ],
  openGraph: {
    title: 'EzUmrah CRM — Run your Umrah & Hajj agency end to end',
    description: 'Sales, passengers, invoicing, documents and reports for Umrah and Hajj travel agencies.',
    type: 'website',
  },
};

const FEATURES = [
  { icon: '✈️', title: 'Flight sales', text: 'Multi-leg itineraries, passenger lists, PNR and ticket tracking, cost and profit per passenger.' },
  { icon: '🏨', title: 'Hotel sales', text: 'Room bookings with supplier cost, sale price, commission and automatic profit math.' },
  { icon: '🛂', title: 'Visa sales', text: 'Visa processing pipeline with document checks, visa numbers and status tracking.' },
  { icon: '🚌', title: 'Transport & ziyarat', text: 'Vehicle types, seat layouts and ziyarat tours from city to city.' },
  { icon: '🕋', title: 'Umrah & Hajj sales', text: 'Dedicated modules for Umrah and Hajj groups with passenger manifests and package pricing.' },
  { icon: '🌍', title: 'Tour sales', text: 'Holiday and tour packages with per-person pricing and passenger management.' },
  { icon: '📦', title: 'Packages', text: 'Build reusable packages with inclusions, pricing and validity, then sell from them.' },
  { icon: '🎯', title: 'Leads & customers', text: 'Capture leads from every source, assign staff, convert to customers and track every touch.' },
  { icon: '📅', title: 'Bookings calendar', text: 'See departures, arrivals and follow-ups across your whole agency in one calendar.' },
  { icon: '💰', title: 'Invoices & quotations', text: 'Professional PDF invoices with your agency branding, email delivery, quotations and balance tracking.' },
  { icon: '🔐', title: 'Roles & permissions', text: 'Owner, manager and staff roles with per-user module access. Audit log visible to the owner only.' },
  { icon: '⚙️', title: 'Your brand, your rules', text: 'Custom agency colors and logo, own SMTP email, currency, timezone and tax regional settings.' },
];

const STATS = [
  { n: '19+', l: 'built-in modules' },
  { n: '100%', l: 'multi-tenant & secure' },
  { n: 'Any', l: 'currency & country' },
  { n: 'PDF', l: 'invoices & manifests' },
];

export default function LandingPage() {
  const formAction = process.env.NEXT_PUBLIC_FORMSPREE_ENDPOINT || 'https://formspree.io/f/your-form-id';
  return (
    <main className="min-h-screen bg-[#faf7f0] text-slate-900">
      {/* NAV */}
      <nav className="sticky top-0 z-50 border-b border-gold/10 bg-white/70 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold text-lg text-white">E</span>
            EzUmrah CRM
          </Link>
          <div className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="hover:text-gold">Features</a>
            <a href="#pricing" className="hover:text-gold">Pricing</a>
            <a href="#contact" className="hover:text-gold">Contact</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-slate-700 hover:text-gold">Sign in</Link>
            <Link href="/signup" className="btn-primary text-sm">Get started</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-gold/20 blur-3xl" />
        <div className="mx-auto max-w-6xl px-4 py-20 text-center md:py-28">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-white/60 px-4 py-1 text-xs font-semibold accent backdrop-blur">
            Built for Umrah & Hajj agencies in 25+ countries
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight md:text-6xl">
            Run your Umrah agency <span className="accent">end to end</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            Flight, hotel, visa, transport and ziyarat sales. Packages, leads, passengers, invoices and reports.
            One workspace for your whole team, from first enquiry to the final invoice.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/signup" className="btn-primary px-8 py-3 text-base">Start your agency</Link>
            <a href="#pricing" className="btn-secondary px-8 py-3 text-base">See pricing</a>
          </div>
          <div className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-4 md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.l} className="card bg-white/60 p-5 backdrop-blur">
                <p className="text-2xl font-extrabold accent">{s.n}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-extrabold">Everything your agency sells, in one system</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">Every module tracks passengers, cost, sale and profit, and totals roll up to agency-wide reports.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card border-gold/20 p-6 transition hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-lg">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gold/10 text-xl">{f.icon}</div>
              <h3 className="font-bold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 grid gap-4 rounded-2xl border border-gold/20 bg-white/60 p-6 backdrop-blur md:grid-cols-3">
          <div>
            <h4 className="font-bold accent">💬 Live team chat</h4>
            <p className="mt-1 text-sm text-slate-600">1-to-1 and group messaging between staff, with owner-only message controls.</p>
          </div>
          <div>
            <h4 className="font-bold accent">🧾 Documents & tasks</h4>
            <p className="mt-1 text-sm text-slate-600">Passport and visa documents, follow-up tasks and support tickets in one place.</p>
          </div>
          <div>
            <h4 className="font-bold accent">📊 Reports & accounts</h4>
            <p className="mt-1 text-sm text-slate-600">Sales, profit, receivables and staff performance across every module.</p>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="border-y border-gold/10 bg-white/50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-extrabold">Simple pricing for every agency</h2>
            <p className="mt-3 text-slate-600">Start with a card at secure checkout. Cancel any time.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {PLAN_IDS.map((id) => {
              const p = PLANS[id];
              const popular = id === 'professional';
              return (
                <div key={id} className={`card relative p-7 ${popular ? 'border-gold shadow-xl' : ''}`}>
                  {popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                      Most popular
                    </span>
                  )}
                  <h3 className="text-lg font-bold">{p.name}</h3>
                  <p className="mt-2 text-4xl font-extrabold">${p.price_monthly}<span className="text-sm font-medium text-slate-400">/month</span></p>
                  <ul className="mt-5 space-y-2.5 text-sm text-slate-600">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2"><span className="mt-0.5 accent">✓</span>{f}</li>
                    ))}
                  </ul>
                  <Link href={`/signup?plan=${id}`} className={`mt-7 w-full ${popular ? 'btn-primary' : 'btn-secondary'}`}>
                    Choose {p.name}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid items-start gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-extrabold">Talk to us</h2>
            <p className="mt-3 text-slate-600">
              Questions about migrating your agency, group bookings or custom requirements? Send us a message and we will get back to you.
            </p>
            <div className="mt-6 space-y-3 text-sm text-slate-600">
              <p>🌍 Trusted by Umrah and Hajj operators across the Middle East, Europe, Asia, Africa and North America.</p>
              <p>🔒 Every agency gets an isolated workspace with row-level security.</p>
            </div>
          </div>
          <form action={formAction} method="POST" className="card space-y-4 p-6">
            <input type="hidden" name="_subject" value="EzUmrah CRM landing page enquiry" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="c-name">Your name</label>
                <input className="input" id="c-name" name="name" required placeholder="Ahmed Ali" />
              </div>
              <div>
                <label className="label" htmlFor="c-agency">Agency name</label>
                <input className="input" id="c-agency" name="agency" required placeholder="Al Noor Travels" />
              </div>
              <div>
                <label className="label" htmlFor="c-email">Email</label>
                <input className="input" id="c-email" name="email" type="email" required placeholder="you@agency.com" />
              </div>
              <div>
                <label className="label" htmlFor="c-whatsapp">WhatsApp number</label>
                <input className="input" id="c-whatsapp" name="whatsapp" placeholder="+92 300 1234567" />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="c-country">Country</label>
              <select className="input" id="c-country" name="country" required defaultValue="">
                <option value="" disabled>Select your country</option>
                {['Saudi Arabia', 'United Arab Emirates', 'Pakistan', 'India', 'Bangladesh', 'Indonesia', 'Malaysia', 'Turkey', 'Egypt', 'United Kingdom', 'United States', 'Canada', 'Australia', 'Germany', 'France', 'Kuwait', 'Qatar', 'Bahrain', 'Oman', 'Jordan', 'Morocco', 'Nigeria', 'South Africa', 'Sri Lanka', 'Philippines', 'Other'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="c-msg">Message</label>
              <textarea className="input min-h-24" id="c-msg" name="message" required placeholder="Tell us about your agency and what you need..." />
            </div>
            <button type="submit" className="btn-primary w-full">Send message</button>
          </form>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gold/10 bg-white/60 py-10 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-slate-500 md:flex-row">
          <p className="flex items-center gap-2 font-semibold text-slate-700">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-gold text-xs text-white">E</span>
            EzUmrah CRM
          </p>
          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-gold">Features</a>
            <a href="#pricing" className="hover:text-gold">Pricing</a>
            <Link href="/login" className="hover:text-gold">Sign in</Link>
            <Link href="/signup" className="hover:text-gold">Get started</Link>
          </div>
          <p>© {new Date().getFullYear()} EzUmrah. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
