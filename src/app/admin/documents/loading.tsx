/**
 * Route-level skeleton for the documents page. Mirrors the upload card plus
 * a few table rows so the swap to real content doesn't jump.
 */
export default function DocumentsLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="pp-skeleton h-8 w-36" />
        <div className="pp-skeleton mt-2 h-4 w-80 max-w-full" />
      </div>

      <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4">
        <div className="pp-skeleton h-4 w-48" />
        <div className="pp-skeleton h-11 w-full" />
        <div className="pp-skeleton h-11 w-full" />
        <div className="pp-skeleton h-11 w-32" />
      </div>

      <div className="overflow-hidden rounded-card border border-border">
        <div className="border-b border-border bg-surface px-4 py-3">
          <div className="pp-skeleton h-3 w-24" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-6 px-4 py-3">
              <div className="pp-skeleton h-4 w-1/3" />
              <div className="pp-skeleton h-5 w-20 rounded-full" />
              <div className="pp-skeleton h-4 w-10" />
              <div className="pp-skeleton h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
