import { uploadSaleDocument, deleteSaleDocument } from '@/lib/crm-actions';
import SubmitButton from '@/components/submit-button';

type Doc = { id: string; file_name: string; size_bytes: number | null; created_at: string };

export default function SaleDocuments({ table, saleId, docs }: { table: string; saleId: string; docs: Doc[] }) {
  return (
    <div className="card mt-8 p-5">
      <h2 className="mb-1 text-lg font-semibold">📎 Documents — tickets, vouchers, IDs</h2>
      <p className="mb-4 text-xs text-slate-400">PDF, JPG, JPEG or PNG (max 10 MB). Images are compressed automatically.</p>
      <form action={uploadSaleDocument} className="mb-4 flex flex-wrap items-center gap-3">
        <input type="hidden" name="table" value={table} />
        <input type="hidden" name="sale_id" value={saleId} />
        <input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png" required
          className="block w-full max-w-xs cursor-pointer rounded-lg border border-slate-200 p-2 text-xs" />
        <SubmitButton className="btn-primary px-4 py-2 text-xs" pendingText="Uploading…">⬆ Upload</SubmitButton>
      </form>
      {docs.length ? (
        <ul className="space-y-2">
          {docs.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <span className="truncate">
                <b>📄 {d.file_name}</b>{' '}
                <span className="text-xs text-slate-400">
                  {d.size_bytes ? `${(d.size_bytes / 1024).toFixed(0)} KB` : ''} · {new Date(d.created_at).toLocaleDateString()}
                </span>
              </span>
              <span className="flex items-center gap-3 text-xs font-semibold">
                <a className="accent hover:underline" href={`/api/sale-doc/${d.id}`} target="_blank" rel="noreferrer">View</a>
                <a className="accent hover:underline" href={`/api/sale-doc/${d.id}?download=1`}>Download</a>
                <form action={deleteSaleDocument}>
                  <input type="hidden" name="id" value={d.id} />
                  <button className="text-red-500 hover:underline" type="submit">Delete</button>
                </form>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-400">No documents uploaded yet.</p>
      )}
    </div>
  );
}
