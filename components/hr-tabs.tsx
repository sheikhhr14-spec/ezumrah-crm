import Link from 'next/link';

const TABS = [
  { href: '/dashboard/hr', label: 'Employees' },
  { href: '/dashboard/hr/attendance', label: 'Attendance' },
  { href: '/dashboard/hr/leaves', label: 'Leaves' },
  { href: '/dashboard/hr/payroll', label: 'Payroll' },
];

export default function HRTabs() {
  return (
    <div className="mb-4 flex flex-wrap gap-2 text-xs">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className="btn-secondary px-3 py-1.5 text-xs">{t.label}</Link>
      ))}
    </div>
  );
}
