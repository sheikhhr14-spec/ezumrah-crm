'use client';
import { useState } from 'react';
import { updateRecord } from '@/lib/crm-actions';
import SubmitButton from '@/components/submit-button';

// Edit popup: click "Edit" to open a centered modal with the record's fields.
export default function RowEdit({ table, id, children, title = 'Edit record' }: {
  table: string; id: string; children: React.ReactNode; title?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="text-xs font-semibold accent hover:underline" onClick={() => setOpen(true)}>Edit</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setOpen(false)}>
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              <button className="text-slate-400 hover:text-slate-700" onClick={() => setOpen(false)} aria-label="Close">✕</button>
            </div>
            <form action={async (fd: FormData) => { await updateRecord(fd); setOpen(false); }}
              className="space-y-2">
              <input type="hidden" name="table" value={table} />
              <input type="hidden" name="id" value={id} />
              {children}
              <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" className="btn-secondary px-4 py-2 text-xs" onClick={() => setOpen(false)}>Cancel</button>
                <SubmitButton className="btn-primary px-4 py-2 text-xs">Save changes</SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
