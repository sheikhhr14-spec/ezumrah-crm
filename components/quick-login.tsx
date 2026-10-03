'use client';

// Demo quick-login — one click per seeded demo agency.
// NOTE: demo credentials only; remove this component before real production use.
const DEMO_AGENCIES = [
  {
    icon: '🇵🇰',
    label: 'Al-Noor Travel & Tours',
    plan: 'Standard · PKR',
    email: 'owner.pak@ezumrah.com',
    password: 'PakOwner@2026',
  },
  {
    icon: '🇦🇪',
    label: 'Emirates Ziyarah Travel',
    plan: 'Professional · AED',
    email: 'owner.dubai@ezumrah.com',
    password: 'DubaiOwner@2026',
  },
  {
    icon: '🇸🇦',
    label: 'Haramain Travel Co.',
    plan: 'Professional · SAR',
    email: 'owner.saudi@ezumrah.com',
    password: 'SaudiOwner@2026',
  },
];

export default function QuickLogin() {
  const loginAs = (email: string, password: string) => {
    const e = document.getElementById('email') as HTMLInputElement | null;
    const p = document.getElementById('password') as HTMLInputElement | null;
    if (!e || !p) return;
    e.value = email;
    p.value = password;
    e.closest('form')?.requestSubmit();
  };
  return (
    <div className="mt-4 rounded-xl border border-dashed border-gold/40 bg-gold/5 p-4">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
        Demo agencies — one-click login
      </p>
      <div className="space-y-2">
        {DEMO_AGENCIES.map((a) => (
          <button
            key={a.email}
            type="button"
            onClick={() => loginAs(a.email, a.password)}
            className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-gold hover:bg-gold/10"
            title={`Sign in as ${a.email}`}
          >
            <span className="flex items-center gap-2">
              <span className="text-base">{a.icon}</span>
              <span>
                <span className="block text-xs font-semibold text-slate-800">{a.label}</span>
                <span className="block text-[10px] text-slate-400">{a.plan}</span>
              </span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wide text-gold">Sign in →</span>
          </button>
        ))}
      </div>
    </div>
  );
}
