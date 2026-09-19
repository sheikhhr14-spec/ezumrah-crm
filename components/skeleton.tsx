// Shared skeleton shown instantly while any dashboard/admin page loads.
export default function DashboardSkeleton() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="h-7 w-48 rounded bg-slate-200" />
          <div className="mt-2 h-4 w-72 rounded bg-slate-100" />
        </div>
        <div className="h-9 w-40 rounded bg-slate-100" />
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card h-24 p-4">
            <div className="h-3 w-20 rounded bg-slate-100" />
            <div className="mt-3 h-6 w-28 rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="card mb-6 h-32 p-4">
        <div className="h-4 w-40 rounded bg-slate-200" />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-9 rounded bg-slate-100" />)}
        </div>
      </div>
      <div className="card p-4">
        <div className="mb-3 h-4 w-full rounded bg-slate-200" />
        {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="mb-2 h-10 rounded bg-slate-100" />)}
      </div>
    </div>
  );
}
