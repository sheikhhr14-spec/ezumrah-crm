'use client';
export default function PrintButton({ label = '🖨 Print voucher' }: { label?: string }) {
  return <button onClick={() => window.print()} className="btn-primary" type="button">{label}</button>;
}
