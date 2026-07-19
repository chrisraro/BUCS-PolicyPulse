/**
 * Route-level skeleton for the escalations page. Mirrors the stacked-card
 * list shape so the swap to real content doesn't jump.
 */
export default function EscalationsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="pp-skeleton h-8 w-40" />
        <div className="pp-skeleton mt-2 h-4 w-96 max-w-full" />
      </div>

      <ul className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i} className="rounded-card border border-border bg-surface p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="pp-skeleton h-4 w-2/3 max-w-sm" />
                <div className="pp-skeleton h-3 w-40" />
              </div>
              <div className="pp-skeleton h-5 w-16 shrink-0 rounded-full" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
