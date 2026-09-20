import { requireModule } from '@/lib/data';
import { PageHeader } from '@/components/ui';
import TourPackagesSection from '@/components/tour-packages-section';
import TourOpsSection from '@/components/tour-ops-section';
import Link from 'next/link';

export default async function TourSalesHub() {
  await requireModule('toursales');
  return (
    <div>
      <PageHeader title="Tour Sales" subtitle="Packages (3/4/7-day, custom), scheduled departures, group bookings 1–50+ passengers, seat & room allocation, pickups, vouchers — all in one module" />
      <TourPackagesSection />
      <div className="h-6" />
      <TourOpsSection />
      <p className="mt-4 text-right text-xs">
        <Link className="accent hover:underline" href="/dashboard/tour-sales/records">Legacy tour sale records →</Link>
      </p>
    </div>
  );
}
