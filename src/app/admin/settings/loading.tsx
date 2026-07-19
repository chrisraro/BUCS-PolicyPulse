/**
 * Route-level skeleton for AI Settings. Mirrors the two form cards (API key
 * + retrieval tuning) so the swap to real content doesn't jump.
 */
export default function AiSettingsLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="pp-skeleton h-8 w-36" />
        <div className="pp-skeleton mt-2 h-4 w-96 max-w-full" />
      </div>

      <div className="flex flex-col gap-5 rounded-card border border-border bg-surface p-4">
        <div className="pp-skeleton h-4 w-20" />
        <div className="flex flex-col gap-1.5">
          <div className="pp-skeleton h-3 w-24" />
          <div className="pp-skeleton h-11 w-full" />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="pp-skeleton h-3 w-16" />
          <div className="pp-skeleton h-11 w-full" />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="pp-skeleton h-3 w-24" />
          <div className="pp-skeleton h-11 w-full" />
        </div>
        <div className="pp-skeleton h-11 w-32" />
      </div>

      <div className="flex flex-col gap-5 rounded-card border border-border bg-surface p-4">
        <div className="pp-skeleton h-4 w-36" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="pp-skeleton h-3 w-24" />
              <div className="pp-skeleton h-11 w-full" />
            </div>
          ))}
        </div>
        <div className="pp-skeleton h-11 w-44" />
      </div>
    </div>
  )
}
