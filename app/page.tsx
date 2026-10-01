import Link from 'next/link';
import { PLANS, PLAN_IDS } from '@/lib/billing';

export const metadata = {
  title: 'EzUmrah CRM — Umrah & Hajj Travel Agency Management Software',
  description:
    'All-in-one CRM for Umrah and Hajj travel agencies worldwide: flight, hotel, visa, transport and ziyarat sales, packages, bookings calendar, leads, invoicing, documents, reports and multi-branch management.',
  keywords: [
    'Umrah CRM', 'Hajj CRM', 'Umrah travel agency software', 'Hajj operator software', 'Umrah booking system',
    'Nusuk visa API', 'Umrah visa management', 'Hajj group management', 'travel agency CRM',
    'Saudi Arabia', 'UAE', 'Pakistan', 'India', 'Bangladesh', 'Indonesia', 'Malaysia', 'Turkey', 'Egypt',
    'United Kingdom', 'USA', 'Canada', 'Australia', 'Germany', 'France', 'Netherlands', 'Spain', 'Italy',
    'Kuwait', 'Qatar', 'Bahrain', 'Oman', 'Jordan', 'Morocco', 'Algeria', 'Tunisia', 'Nigeria', 'Kenya',
    'South Africa', 'Sri Lanka', 'Philippines',
  ],
  openGraph: {
    title: 'EzUmrah CRM — Run your Umrah & Hajj agency end to end',
    description: 'Sales, passengers, invoicing, documents and reports for Umrah and Hajj travel agencies.',
    type: 'website',
  },
};

const MODULES = [
  {
    icon: '✈️', title: 'Flight sales', tag: 'Ticketing desk',
    text: 'Record every flight sale the way a ticketing desk actually works: multi-leg itineraries, full passenger manifests and money that adds up by itself.',
    points: [
      'Multi-leg itineraries with airline, flight number, airports, cabin and baggage',
      'Passenger manifests: passport, DOB with auto-age, PNR, ticket number, pax type (ADT / CHD / INF)',
      'Per-passenger Fare, Tax and Other charges roll up into Cost amount automatically',
      'Profit per passenger and per sale, with commission, discount and admin fee',
      'Payment tracking: paid, balance, due date and payment status per sale',
      'Branded PDF invoice + email delivery in one click',
    ],
  },
  {
    icon: '🏨', title: 'Hotel sales', tag: 'Hotel desk',
    text: 'Book Makkah and Madinah hotels with full stay details and instant margin math.',
    points: [
      'Hotel, city, check-in / check-out, nights and room counts',
      'Supplier cost vs sale price with commission on top',
      'Extra stays on the same sale for split-city itineraries',
      'Balance and payment status tracking with due dates',
    ],
  },
  {
    icon: '🛂', title: 'Visa sales', tag: 'Visa pipeline',
    text: 'A complete visa pipeline, from application to issuance, ready for the Nusuk API.',
    points: [
      'Visa type, application, embassy submission, issue and expiry dates',
      'Processing center, speed, sponsor and insurance tracking',
      'Insurance expiry dates kept alongside the visa',
      'Visa pipeline: application, embassy submission, issue and expiry dates with insurance tracking',
      'Optional Nusuk (Ministry of Hajj & Umrah) API integration on Enterprise: submit and sync right from the sale',
    ],
  },
  {
    icon: '🚌', title: 'Transport & Ziyarat', tag: 'Ground ops',
    text: 'Airport pickups, intercity transfers and ziyarat tours with the vehicle details your operations team needs.',
    points: [
      'Vehicle types with front-to-back seat layouts and driver-side identification',
      'Multi-leg transport routes on one sale',
      'Ziyarat tours from city to city with dates and times',
      'Cost, sale price and profit per trip',
    ],
  },
  {
    icon: '🕋', title: 'Umrah & Hajj sales', tag: 'Group travel',
    text: 'Dedicated modules for the two journeys that matter most, built for group handling.',
    points: [
      'Umrah and Hajj sales as first-class modules, not afterthoughts',
      'Passenger manifests with package details per sale',
      'Per-person pricing with pax counts and package-level totals',
      'Profit, balances and due dates tracked to the group',
    ],
  },
  {
    icon: '📦', title: 'Packages', tag: 'Product shelf',
    text: 'Turn your fixed departures into reusable products you can sell again and again.',
    points: [
      'Build packages with inclusions, pricing and validity dates',
      'Sell from a package and inherit all its details',
      'Tour sales module for holiday and custom tours',
      'Package manifests linked to passenger records',
    ],
  },
];

const PLATFORM = [
  { icon: '🎯', title: 'Leads pipeline', points: ['Capture leads from walk-ins, WhatsApp and referrals', 'Assign owners and track follow-up dates', 'Convert leads to customers in one click'] },
  { icon: '📅', title: 'Bookings calendar', points: ['Every departure and follow-up in one calendar', 'Color-coded by module and status', 'Never miss a follow-up date'] },
  { icon: '💰', title: 'Invoices & quotations', points: ['Professional quotations with line items, terms and validity', 'Accept a quote and it converts to an invoice', 'Branded PDFs and one-click email delivery'] },
  { icon: '📊', title: 'Reports & accounts', points: ['Sales, profit and receivables across every module', 'Staff performance and top customers', 'Agency-wide totals in your currency'] },
  { icon: '👥', title: 'Roles & permissions', points: ['Owner, manager and staff roles', 'Per-user module access with checkboxes', 'Owner-only audit log and billing controls'] },
  { icon: '💬', title: 'Live team chat', points: ['1-to-1 and group channels', 'Owner-controlled message editing and deletion', 'Talk shop without leaving the CRM'] },
  { icon: '✅', title: 'Tasks & support', points: ['Follow-up tasks with due dates', 'Support tickets with status workflow', 'Documents module for passports and visas'] },
  { icon: '🧑‍💼', title: 'HR & payroll', points: ['Employee records with contracts and documents', 'Salary slips with allowances and deductions', 'Payslip PDFs straight from the system'] },
  { icon: '🎨', title: 'Your brand', points: ['Custom logo, brand color and agency details', 'Your own SMTP for every outbound email', 'Currency, timezone and tax rate per agency'] },
];

const INTEGRATIONS = [
  { icon: '🕌', title: 'Nusuk visa API', text: 'Submit Umrah visa applications and sync statuses through the official Ministry of Hajj & Umrah platform. Included with Enterprise.' },
  { icon: '💳', title: 'Stripe billing', text: 'Secure checkout for your subscription. Cards, invoices and plan upgrades handled automatically.' },
  { icon: '📄', title: 'Branded PDF engine', text: 'Invoices, quotations, payslips and manifests with your logo, colors and terms on every document.' },
  { icon: '📧', title: 'Own SMTP email', text: 'Every email your agency sends — invoices, quotations, reminders — goes from your own domain.' },
  { icon: '🌍', title: 'Multi-currency & regional', text: 'Currency, timezone and tax configured per agency. Sell from anywhere, bill correctly everywhere.' },
  { icon: '🔐', title: 'Multi-tenant security', text: 'Row-level security keeps every agency workspace isolated. Your data is yours alone.' },
];

const FAQ = [
  { q: 'Is my agency data separate from other agencies?', a: 'Yes. EzUmrah CRM is fully multi-tenant with row-level security — every record belongs to your agency and is never visible to others.' },
  { q: 'Can I use my own logo and colors?', a: 'Absolutely. Your logo, brand color, agency details and email domain are applied across the dashboard, invoices and quotations.' },
  { q: 'Does it connect to the Nusuk visa platform?', a: 'Yes — the Nusuk (Ministry of Hajj & Umrah) API integration is included with the Enterprise plan. Add your licensed-agent credentials under Settings → Integrations and submit applications directly from Visa Sales, with status sync.' },
  { q: 'How does user pricing work?', a: 'The Professional plan at $100/month includes 2 users. Each additional user is $50/month. Enterprise includes unlimited users.' },
  { q: 'What is white-labeling?', a: 'Enterprise agencies get the whole CRM under their own domain and brand — your clients and staff never see our name. It also unlocks GDS integration and full API access.' },
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
            <a href="#modules" className="hover:text-gold">Modules</a>
            <a href="#platform" className="hover:text-gold">Platform</a>
            <a href="#integrations" className="hover:text-gold">Integrations</a>
            <a href="#pricing" className="hover:text-gold">Pricing</a>
            <a href="#faq" className="hover:text-gold">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-slate-700 hover:text-gold">Sign in</Link>
            <Link href="/signup" className="btn-primary text-sm">Get started</Link>
          </div>
        </div>
      </nav>

      {/* HERO + MOCKUP */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-gold/20 blur-3xl" />
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-16 text-center md:pt-24">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-white/60 px-4 py-1 text-xs font-semibold accent backdrop-blur">
            Built for Umrah & Hajj agencies in 25+ countries
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight md:text-6xl">
            Run your Umrah agency <span className="accent">end to end</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            Flight, hotel, visa, transport and ziyarat sales. Packages, leads, passengers, quotations and reports.
            One workspace for your whole team, from first enquiry to the final invoice.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/signup" className="btn-primary px-8 py-3 text-base">Start your agency</Link>
            <a href="#modules" className="btn-secondary px-8 py-3 text-base">Explore the modules</a>
          </div>
          {/* CSS product mockup */}
          <div className="mx-auto mt-14 max-w-4xl rounded-2xl border border-gold/30 bg-white/70 p-3 shadow-2xl backdrop-blur">
            <div className="flex items-center gap-1.5 border-b border-slate-100 px-2 pb-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-300" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
              <span className="ml-3 text-[10px] font-semibold text-slate-400">ezumrah-crm — dashboard</span>
            </div>
            <div className="mt-2 grid gap-3 text-left sm:grid-cols-[150px_1fr]">
              <div className="hidden rounded-xl bg-slate-50 p-3 sm:block">
                {['📊 Dashboard', '✈️ Flight sales', '🏨 Hotel sales', '🛂 Visa sales', '🕋 Umrah sales', '📦 Packages', '🎯 Leads', '💰 Invoices'].map((r) => (
                  <p key={r} className="mb-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-slate-500">{r}</p>
                ))}
              </div>
              <div className="rounded-xl bg-slate-50/60 p-3">
                <div className="grid grid-cols-3 gap-2">
                  {[['Sales this month', '$48,250'], ['Profit', '$6,840'], ['Unpaid balance', '$3,120']].map(([l, v]) => (
                    <div key={l} className="rounded-lg border border-gold/20 bg-white p-2.5">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{l}</p>
                      <p className="text-sm font-extrabold accent">{v}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex h-20 items-end gap-1.5 rounded-lg border border-gold/20 bg-white p-2">
                  {[35, 55, 40, 70, 62, 85, 58, 92, 76, 100, 88, 68].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t bg-gold/80" style={{ height: `${h}%` }} />
                  ))}
                </div>
                <div className="mt-3 space-y-1.5">
                  {[['FS-2026-0101', 'Al Noor group · 12 pax', 'Paid'], ['HT-2026-0034', 'Makkah 5 nights', 'Partial'], ['VS-2026-0090', 'Umrah visa · Nusuk', 'Processing']].map(([a, b, c]) => (
                    <div key={a} className="flex items-center justify-between rounded-md bg-white px-2 py-1.5 text-[10px]">
                      <span className="font-bold">{a}</span><span className="text-slate-400">{b}</span>
                      <span className="rounded-full bg-gold/10 px-2 py-0.5 font-semibold accent">{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MODULES DEEP DIVE */}
      <section id="modules" className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-extrabold md:text-4xl">Everything you sell, in one system</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">Every module tracks passengers, cost, sale and profit, and totals roll up to agency-wide reports. No spreadsheets, no double entry.</p>
        </div>
        <div className="space-y-8">
          {MODULES.map((m, i) => (
            <div key={m.title} className={`card border-gold/20 p-6 md:p-8 ${i % 2 ? 'md:border-l-4' : 'md:border-r-4'} border-gold`}>
              <div className="grid items-start gap-6 md:grid-cols-[1fr_1.4fr]">
                <div>
                  <p className="mb-2 inline-block rounded-full bg-gold/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide accent">{m.tag}</p>
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold/10 text-2xl">{m.icon}</span>
                    <h3 className="text-2xl font-extrabold">{m.title}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{m.text}</p>
                </div>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {m.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2 rounded-lg bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-600">
                      <span className="mt-0.5 accent">✓</span>{pt}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PLATFORM GRID */}
      <section id="platform" className="border-y border-gold/10 bg-white/50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-extrabold md:text-4xl">Run the whole agency, not just the sales</h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-600">Leads, follow-ups, documents, payroll and team chat are built in — the work that happens around every sale.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {PLATFORM.map((f) => (
              <div key={f.title} className="card border-gold/20 p-6 transition hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-lg">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gold/10 text-xl">{f.icon}</div>
                <h3 className="font-bold">{f.title}</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                  {f.points.map((pt) => <li key={pt} className="flex items-start gap-2"><span className="mt-1 text-[10px] accent">●</span>{pt}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INTEGRATIONS */}
      <section id="integrations" className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-extrabold md:text-4xl">Plugged into your world</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">Connect the platforms your agency already depends on — starting with the Saudi Ministry of Hajj & Umrah.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {INTEGRATIONS.map((f) => (
            <div key={f.title} className="card border-gold/20 p-6">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gold/10 text-xl">{f.icon}</div>
              <h3 className="font-bold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-y border-gold/10 bg-white/50 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-10 text-center text-3xl font-extrabold md:text-4xl">From signup to first invoice in a day</h2>
          <div className="grid gap-6 md:grid-cols-4">
            {[
              { n: '1', t: 'Create your agency', d: 'Sign up, pick a plan and your isolated workspace is ready in minutes.' },
              { n: '2', t: 'Add your team', d: 'Invite managers and staff, tick exactly which modules each person can use.' },
              { n: '3', t: 'Sell & track', d: 'Log flight, hotel, visa and transport sales with passengers and payments.' },
              { n: '4', t: 'Get paid & report', d: 'Branded invoices by email, balances tracked, profit reported live.' },
            ].map((s) => (
              <div key={s.n} className="card p-6 text-center">
                <p className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gold font-extrabold text-white">{s.n}</p>
                <h3 className="font-bold">{s.t}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-extrabold md:text-4xl">Two plans. No surprises.</h2>
          <p className="mt-3 text-slate-600">Professional is billed monthly by card. Enterprise is priced per agency with white-labeling, GDS and API.</p>
        </div>
        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          {PLAN_IDS.map((id) => {
            const p: any = (PLANS as any)[id];
            const popular = id === 'professional';
            const custom = p.price_monthly === null;
            return (
              <div key={id} className={`card relative p-8 ${popular ? 'border-gold shadow-xl' : ''}`}>
                {popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">Most popular</span>
                )}
                <h3 className="text-lg font-bold">{p.name}</h3>
                <p className="mt-2 text-4xl font-extrabold">{custom ? 'Custom' : `$${p.price_monthly}`}<span className="text-sm font-medium text-slate-400">{custom ? ' pricing' : '/month'}</span></p>
                {!custom && <p className="mt-1 text-xs text-slate-400">2 users included · +$50 per extra user</p>}
                {custom && <p className="mt-1 text-xs text-slate-400">Unlimited users · arranged with our team</p>}
                <ul className="mt-5 space-y-2.5 text-sm text-slate-600">
                  {p.features.map((f: string) => (
                    <li key={f} className="flex items-start gap-2"><span className="mt-0.5 accent">✓</span>{f}</li>
                  ))}
                </ul>
                <Link href={`/signup?plan=${id}`} className={`mt-7 w-full ${popular ? 'btn-primary' : 'btn-secondary'}`}>{custom ? 'Talk to us' : `Choose ${p.name}`}</Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-y border-gold/10 bg-white/50 py-16">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="mb-8 text-center text-3xl font-extrabold">Questions agencies ask</h2>
          <div className="space-y-4">
            {FAQ.map((f) => (
              <details key={f.q} className="card border-gold/20 p-5 [&_summary]:cursor-pointer">
                <summary className="font-bold">{f.q}</summary>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.a}</p>
              </details>
            ))}
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
            <a href="#modules" className="hover:text-gold">Modules</a>
            <a href="#integrations" className="hover:text-gold">Integrations</a>
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
