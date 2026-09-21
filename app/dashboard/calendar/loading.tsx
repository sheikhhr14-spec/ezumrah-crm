export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-sm font-semibold text-slate-400">
        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
        Loading…
      </div>
      <div className="card p-4">
        <div className="mb-4 h-6 w-56 animate-pulse rounded bg-slate-100" />
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded bg-slate-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
