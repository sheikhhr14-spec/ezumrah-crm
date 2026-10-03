'use client';

/** Renders owner-defined custom field inputs in the given grid. Client-side (needs onChange state). */
export default function CustomFieldInputs({ fields, cf, setCf }: {
  fields: { id: string; label: string; field_type: string; section?: string }[];
  cf: Record<string, string>;
  setCf: (v: Record<string, string>) => void;
}) {
  if (fields.length === 0) return null;
  return (
    <>
      {fields.map((f) => (
        <div key={f.id}>
          <label className="label" htmlFor={`cf-${f.id}`}>
            {f.label}{f.field_type === 'plus' ? ' (+ total)' : f.field_type === 'minus' ? ' (− total)' : ''}
          </label>
          {f.field_type === 'date' ? (
            <input className="input" id={`cf-${f.id}`} name={`cf_${f.id}`} type="date"
              onChange={(e) => setCf({ ...cf, [f.id]: e.target.value })} value={cf[f.id] || ''} />
          ) : f.field_type === 'text' ? (
            <input className="input" id={`cf-${f.id}`} name={`cf_${f.id}`}
              onChange={(e) => setCf({ ...cf, [f.id]: e.target.value })} value={cf[f.id] || ''} />
          ) : (
            <input className="input" id={`cf-${f.id}`} name={`cf_${f.id}`} type="number" step="0.01"
              onChange={(e) => setCf({ ...cf, [f.id]: e.target.value })} value={cf[f.id] || ''} />
          )}
        </div>
      ))}
    </>
  );
}
