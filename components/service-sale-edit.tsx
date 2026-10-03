import { getCustomFields } from '@/lib/custom-fields';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireModule } from '@/lib/data';
import { SERVICE_SALES } from '@/lib/service-sales';
import ServiceSaleForm from '@/components/service-sale-form';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const MODULE_KEY: Record<string, string> = {
  hotel_sales: 'hotelsales',
  visa_sales: 'visasales',
  transport_sales: 'transportsales',
};

export default async function ServiceSaleEditPage({ table, id }: { table: string; id: string }) {
  const cfg = SERVICE_SALES[table];
  const ctx = await requireModule(MODULE_KEY[table]);
  const cur = (ctx as any).agency?.currency;
  const aid = ctx.profile.agency_id;
  const db = createAdminClient();

  const { data: rec } = await db.from(table).select('*').eq('id', id).eq('agency_id', aid).single();
  if (!rec) notFound();
  let extras: any[] = [];
  if (table === 'hotel_sales') {
    const r = await db.from('hotel_sale_stays').select('*').eq('hotel_sale_id', rec.id).order('created_at');
    extras = r.data || [];
  } else if (table === 'transport_sales') {
    const r2 = await db.from('transport_sale_legs').select('*').eq('transport_sale_id', rec.id).order('leg_no');
    extras = r2.data || [];
  }
  const [{ data: customers }, cfDefs] = await Promise.all([
    db.from('customers').select('id, full_name').eq('agency_id', aid).order('full_name').limit(500),
    getCustomFields(db, aid, table),
  ]);

  return (
    <div>
      <Link className="text-sm text-slate-400 hover:text-gold" href={`/dashboard/${cfg.route}/${rec.id}`}>← Back to {rec.ref}</Link>
      <div className="mt-2 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Edit {cfg.title.toLowerCase().replace(/ sales$/, ' sale')} {rec.ref}</h1>
          <p className="text-sm text-slate-500">Full form — customer, details, extras, pricing & payment. Totals recalculate on save.</p>
        </div>
      </div>
      <div className="card p-6">
        <ServiceSaleForm
          table={table} fields={cfg.fields} customers={customers || []}
          currency={cur} taxRate={Number((ctx as any).agency?.tax_rate || 0)}
          customFields={cfDefs} sale={rec} saleExtras={extras || []}
        />
      </div>
    </div>
  );
}
