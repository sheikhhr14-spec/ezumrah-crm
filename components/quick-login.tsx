'use client';

// TEMPORARY demo quick-login for testing. Remove before production.
const DEMO_USERS = [
  { label: 'Super Admin', email: 'hamza@ezumrah.com', password: 'EzUmrah@2026!', icon: '🛡️' },
  { label: 'Owner — Al Noor', email: 'owner@alnoor.com', password: 'Demo@1234', icon: '👑' },
  { label: 'Manager — Al Noor', email: 'manager@alnoor.com', password: 'Demo@1234', icon: '🧑‍💼' },
  { label: 'Staff — Al Noor', email: 'staff@alnoor.com', password: 'Demo@1234', icon: '👤' },
  { label: 'Manager — Demo Agency', email: 'sara.manager@alnoor-demo.com', password: 'Demo@1234', icon: '🌍' },
  { label: 'Staff — Demo Agency', email: 'lina.staff@alnoor-demo.com', password: 'Demo@1234', icon: '🌐' },
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
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Demo quick login (remove before production)</p>
      <div className="grid grid-cols-2 gap-2">
        {DEMO_USERS.map((u) => (
          <button
            key={u.email}
            type="button"
            onClick={() => loginAs(u.email, u.password)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-left text-[11px] font-medium text-slate-600 transition hover:border-gold hover:bg-gold/10 hover:text-slate-900"
            title={`Sign in as ${u.email}`}
          >
            <span className="mr-1">{u.icon}</span>{u.label}
          </button>
        ))}
      </div>
    </div>
  );
}
