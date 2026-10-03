import FlightSaleForm from '@/components/flight-sale-form';
import { getCustomFields } from '@/lib/custom-fields';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireModule } from '@/lib/data';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function EditFlightSalePage({ params }: { params: { id: string } }) {
  const ctx = await requireModule('flightsales');
  const cur = (ctx as any).agency?.currency;
  const aid = ctx.profile.agency_id;
  const db = createAdminClient();

  const { data: sale } = await db.from('flight_sales').select('*')
    .eq('id', params.id).eq('agency_id', aid).single();
  if (!sale) notFound();

  const [{ data: legs }, { data: passengers }, { data: customers }, cfDefs] = await Promise.all([
    db.from('flight_sale_legs').select('*').eq('flight_sale_id', sale.id).order('leg_no'),
    db.from('flight_sale_passengers').select('*').eq('flight_sale_id', sale.id).order('is_lead', { ascending: false }).order('created_at'),
    db.from('customers').select('id, full_name').eq('agency_id', aid).order('full_name').limit(500),
    getCustomFields(db, aid, 'flight_sales'),
  ]);

  return (
    <div>
      <Link className="text-sm text-slate-400 hover:text-gold" href={`/dashboard/flight-sales/${sale.id}`}>← Back to {sale.ref}</Link>
      <div className="mt-2 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Edit flight sale {sale.ref}</h1>
          <p className="text-sm text-slate-500">Full form — customer, passengers, trip legs, payment & totals recalculate on save.</p>
        </div>
      </div>
      <div className="card p-6">
        <FlightSaleForm
          customers={customers || []} currency={cur}
          taxRate={Number((ctx as any).agency?.tax_rate || 0)}
          customFields={cfDefs}
          sale={sale} saleLegs={legs || []} salePassengers={passengers || []}
        />
      </div>
    </div>
  );
}
