import { updateRecord } from '@/lib/crm-actions';

export default function RowEdit({ table, id, children }: { table: string; id: string; children: React.ReactNode }) {
  return (
    <details className="relative">
      <summary className="cursor-pointer select-none text-xs font-semibold accent hover:underline">Edit</summary>
      <form action={updateRecord} className="mt-2 w-64 space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-lg">
        <input type="hidden" name="table" value={table} />
        <input type="hidden" name="id" value={id} />
        {children}
        <button className="btn-primary w-full px-3 py-1.5 text-xs" type="submit">Save changes</button>
      </form>
    </details>
  );
}
