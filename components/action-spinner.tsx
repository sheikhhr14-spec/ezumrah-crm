'use client';
import { useEffect, useState } from 'react';

export default function ActionSpinner() {
  const [pending, setPending] = useState(0);
  useEffect(() => {
    const orig = window.fetch.bind(window);
    let count = 0;
    (window as any).fetch = async (input: any, init?: any) => {
      let isAction = false;
      try {
        const h = new Headers(init?.headers || (typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined));
        isAction = h.has('next-action');
      } catch {}
      const p = orig(input, init);
      if (isAction) {
        count++; setPending(count);
        p.finally(() => { count = Math.max(0, count - 1); setPending(count); });
      }
      return p;
    };
    return () => { (window as any).fetch = orig; };
  }, []);
  if (!pending) return null;
  return (
    <div role="status" aria-live="polite"
      className="fixed bottom-4 right-4 z-[100] flex items-center gap-2 rounded-full bg-slate-900/90 px-4 py-2 text-xs font-semibold text-white shadow-xl">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      Saving changes…
    </div>
  );
}
