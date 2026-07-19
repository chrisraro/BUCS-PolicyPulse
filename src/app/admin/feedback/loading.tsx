/**
 * Route-level skeleton for the feedback page. Mirrors the rating filter row
 * plus a few table rows so the swap to real content doesn't jump.
 */
export default function FeedbackLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="pp-skeleton h-8 w-32" />
        <div className="pp-skeleton mt-2 h-4 w-72 max-w-full" />
      </div>

      <div className="flex gap-2">
        <div className="pp-skeleton h-11 w-16 rounded-full" />
        <div className="pp-skeleton h-11 w-28 rounded-full" />
        <div className="pp-skeleton h-11 w-32 rounded-full" />
      </div>

      <div className="overflow-hidden rounded-card border border-border">
        <div className="border-b border-border bg-surface px-4 py-3">
          <div className="pp-skeleton h-3 w-24" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-6 px-4 py-3">
              <div className="pp-skeleton h-4 w-6" />
              <div className="pp-skeleton h-4 w-1/3" />
              <div className="pp-skeleton h-4 w-1/4" />
              <div className="pp-skeleton h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
