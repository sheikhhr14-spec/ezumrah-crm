// Custom fields: per-agency, per-module field definitions stored in custom_field_defs.
// Values live in <table>.custom_data (jsonb) keyed by definition id.
// Plus/minus fields adjust the sale grand total and appear on invoices.

import { createAdminClient } from '@/lib/supabase/admin';

export type CustomFieldType = 'text' | 'number' | 'plus' | 'minus' | 'date';
export type CustomFieldDef = {
  id: string;
  label: string;
  field_type: CustomFieldType;
  position: number;
  section?: string;
};

/** Where a custom field renders inside a sale form */
export const CF_SECTIONS: { id: string; label: string }[] = [
  { id: 'general', label: 'Additional details (own block at the end)' },
  { id: 'customer', label: 'Customer section' },
  { id: 'money', label: 'Price & payment section' },
  { id: 'payment', label: 'Payment section' },
];

export async function getCustomFields(db: any, aid: string, module: string): Promise<CustomFieldDef[]> {
  const { data } = await db.from('custom_field_defs')
    .select('id, label, field_type, position, section')
    .eq('agency_id', aid).eq('module', module).eq('active', true)
    .order('position').order('created_at');
  return (data || []) as CustomFieldDef[];
}

/** Read submitted form values (cf_<id>) into a custom_data object */
export function parseCustomValues(fd: FormData, defs: CustomFieldDef[]): Record<string, string | number> | null {
  const out: Record<string, string | number> = {};
  let any = false;
  for (const d of defs) {
    const raw = fd.get(`cf_${d.id}`);
    if (raw === null) continue;
    const v = String(raw).trim();
    if (v === '') continue;
    any = true;
    if (d.field_type === 'number' || d.field_type === 'plus' || d.field_type === 'minus') {
      out[d.id] = Number(v) || 0;
    } else {
      out[d.id] = v;
    }
  }
  return any ? out : null;
}

/** Net money effect of plus/minus fields on a sale (custom_data + defs) */
export function customAdjustment(customData: any, defs: CustomFieldDef[]): number {
  if (!customData || typeof customData !== 'object') return 0;
  let adj = 0;
  for (const d of defs) {
    const v = Number(customData[d.id]);
    if (!Number.isFinite(v) || !v) continue;
    if (d.field_type === 'plus') adj += v;
    else if (d.field_type === 'minus') adj -= v;
  }
  return adj;
}

export const CF_TYPE_LABEL: Record<CustomFieldType, string> = {
  text: 'Text',
  number: 'Number',
  plus: 'Amount — adds to total',
  minus: 'Amount — deducts from total',
  date: 'Date',
};
