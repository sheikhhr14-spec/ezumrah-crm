import { createAdminClient } from '@/lib/supabase/admin';
import { requireModule } from '@/lib/data';
import PackageSaleForm from '@/components/package-sale-form';
import PackageSalesList from '@/components/package-sales-list';
import { getCustomFields } from '@/lib/custom-fields';
import CustomFieldsManager from '@/components/custom-fields-manager';
import { PageHeader } from '@/components/ui';

export default async function Tour_SalesPage() {
  const agctx: any = await requireModule('toursales');
  const db = createAdminClient();
  const { data } = await db.from('package_sales')
    .select('id, ref, package_name, pax, departure_date, return_date, sale_price, supplement, admin_fee, discount, amount_paid, balance, profit, payment_status, status, due_date, customers(full_name)')
    .eq('package_category', 'tour').eq('agency_id', agctx.profile.agency_id).order('created_at', { ascending: false });
  const { data: customers } = await db.from('customers').select('id, full_name, phone').eq('agency_id', agctx.profile.agency_id).order('full_name');
  const cfDefs = await getCustomFields(db, agctx.profile.agency_id, 'tour_sales');

  return (
    <div>
      <PageHeader title="Tour Sales" subtitle="Tour package bookings — groups, flights, hotels and itineraries" />
      <div className="card mb-6 p-5">
        <h2 className="mb-4 text-lg font-semibold">➕ New Tour booking</h2>
        <PackageSaleForm category="tour" customFields={cfDefs} customers={(customers || []).map((c: any) => ({ id: c.id, full_name: c.full_name }))}  currency={(agctx.agency || {}).currency} taxRate={Number((agctx.agency || {}).tax_rate || 0)} />
      </div>
      <CustomFieldsManager module="tour_sales" revalidate="tour-sales/records" />
        <PackageSalesList list={(data || []) as any[]} currency={(agctx.agency || {}).currency} />
    </div>
  );
}
