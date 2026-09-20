import { createAdminClient } from '@/lib/supabase/admin';
import { requireModule } from '@/lib/data';
import PackageSaleForm from '@/components/package-sale-form';
import PackageSalesList from '@/components/package-sales-list';
import { PageHeader } from '@/components/ui';

export default async function Umrah_SalesPage() {
  await requireModule('umrahsales');
  const db = createAdminClient();
  const { data } = await db.from('package_sales')
    .select('id, ref, package_name, pax, departure_date, return_date, sale_price, supplement, admin_fee, discount, amount_paid, balance, profit, payment_status, status, due_date, customers(full_name)')
    .eq('package_category', 'umrah').order('created_at', { ascending: false });
  const { data: customers } = await db.from('customers').select('id, full_name').order('full_name');

  return (
    <div>
      <PageHeader title="Umrah Sales" subtitle="Umrah package bookings — families, group flights, buses, hotels & ziyarat" />
      <div className="card mb-6 p-5">
        <h2 className="mb-4 text-lg font-semibold">➕ New Umrah booking</h2>
        <PackageSaleForm category="umrah" customers={(customers || []).map((c: any) => ({ id: c.id, full_name: c.full_name }))} />
      </div>
      <PackageSalesList list={(data || []) as any[]} />
    </div>
  );
}
