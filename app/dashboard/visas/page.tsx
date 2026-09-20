import { createAdminClient } from '@/lib/supabase/admin';
import { requireModule } from '@/lib/data';
import { setRecordStatus, deleteRecord } from '@/lib/crm-actions';
import RowEdit from '@/components/row-edit';
import { PageHeader, Table, Empty, StatusBadge } from '@/components/ui';
import Link from 'next/link';

export default async function VisasPage({ searchParams }: { searchParams: { q?: string } }) {
  const ctx = await requireModule('visas');
  const db = createAdminClient();
  const [{ data: records }, { data: bookings }, { data: customers }] = await Promise.all([
    db.from('visas').select('*, customers(full_name), bookings(booking_ref, customers(full_name))').eq('agency_id', ctx.profile.agency_id)
      .order('created_at', { ascending: false }),
    db.from('bookings').select('id, booking_ref, package_name').eq('agency_id', ctx.profile.agency_id)
      .order('created_at', { ascending: false }).limit(100),
    db.from('customers').select('id, full_name').eq('agency_id', ctx.profile.agency_id)
      .order('full_name').limit(500),
  ]);

  const q = (searchParams?.q || '').toLowerCase();
  const list = (records || []).filter((r: any) => !q || JSON.stringify(r).toLowerCase().includes(q));

  return (
    <div>
      <PageHeader title="Visas" subtitle={`${records?.length ?? 0} visa applications across all bookings`} />

      <form className="mb-4">
        <input className="input max-w-xs" name="q" placeholder="Search…" defaultValue={searchParams?.q || ''} />
        <button className="btn-secondary ml-2" type="submit">Search</button>
      </form>

      <Table head={['Booking', 'Type', 'Visa no.', 'Applied', 'Status', 'Actions']}>
        {list.length ? list.map((r: any) => (
          <tr key={r.id} className="hover:bg-slate-50">
            <td className="px-4 py-2">
              {r.booking_id ? (
                <>
                  <Link href={`/dashboard/bookings/${r.booking_id}`} className="font-semibold accent hover:underline">
                    {r.bookings?.booking_ref || '—'}
                  </Link>
                  <br /><span className="text-xs text-slate-400">{r.bookings?.customers?.full_name || ''}</span>
                </>
              ) : (
                <>
                  <span className="badge bg-slate-100 text-slate-500">standalone</span>
                  <br /><span className="text-xs font-semibold">{r.customers?.full_name || '—'}</span>
                </>
              )}
            </td>
            <td className="px-4 py-2">{r.visa_type || '—'}</td>
            <td className="px-4 py-2">{r.visa_no || '—'}</td>
            <td className="px-4 py-2">{r.application_date || '—'}</td>
            <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
            <td className="px-4 py-2">
              <div className="flex items-center gap-2">
                <form action={setRecordStatus} className="flex gap-1">
                  <input type="hidden" name="table" value="visas" />
                  <input type="hidden" name="id" value={r.id} />
                  <select name="status" defaultValue={r.status} className="input max-w-28 px-2 py-1 text-xs">
                    <option value="applied">applied</option>
                    <option value="processing">processing</option>
                    <option value="issued">issued</option>
                    <option value="rejected">rejected</option>
                  </select>
                  <button className="btn-secondary px-2 py-1 text-xs" type="submit">Set</button>
                </form>
                <a className="text-xs font-semibold accent hover:underline" href={`/api/invoice-pdf?type=visas&id=${r.id}`}>PDF</a>
                <RowEdit table="visas" id={r.id}><label className="text-[10px] text-slate-400">Visa type</label><input className="input px-2 py-1 text-xs" name="visa_type" defaultValue={r.visa_type || ''} /><label className="text-[10px] text-slate-400">Visa no</label><input className="input px-2 py-1 text-xs" name="visa_no" defaultValue={r.visa_no || ''} /><label className="text-[10px] text-slate-400">Applied</label><input className="input px-2 py-1 text-xs" type="date" name="application_date" defaultValue={r.application_date || ''} /><label className="text-[10px] text-slate-400">Status</label><select className="input px-2 py-1 text-xs" name="status"><option value="applied" selected={r.status === "applied"}> applied</option><option value="processing" selected={r.status === "processing"}> processing</option><option value="issued" selected={r.status === "issued"}> issued</option><option value="rejected" selected={r.status === "rejected"}> rejected</option><option value="expired" selected={r.status === "expired"}> expired</option></select><label className="text-[10px] text-slate-400">Notes</label><input className="input px-2 py-1 text-xs" name="notes" defaultValue={r.notes || ''} /></RowEdit>
                <form action={deleteRecord}>
                  <input type="hidden" name="table" value="visas" />
                  <input type="hidden" name="id" value={r.id} />
                  <button className="text-xs font-semibold text-red-500 hover:underline" type="submit">Delete</button>
                </form>
              </div>
            </td>
          </tr>
        )) : <tr><td colSpan={10}><Empty msg="No visa records yet." /></td></tr>}
      </Table>
    </div>
  );
}
