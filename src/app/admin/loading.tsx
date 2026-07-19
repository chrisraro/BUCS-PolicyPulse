/**
 * Route-level skeleton for the admin dashboard. Mirrors the real page's
 * shape (setup checklist card + definition-list rows) so the swap from
 * skeleton to content doesn't cause a layout jump. See PRODUCT.md: skeletons
 * for loading, never a bare content-area spinner.
 */
export default function AdminDashboardLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="pp-skeleton h-8 w-40" />
        <div className="pp-skeleton mt-2 h-4 w-64" />
      </div>

      <div className="rounded-card border border-border bg-surface p-4">
        <div className="pp-skeleton h-4 w-16" />
        <div className="pp-skeleton mt-2 h-4 w-72 max-w-full" />
        <div className="mt-3 flex flex-col gap-2">
          <div className="pp-skeleton h-11 w-full" />
          <div className="pp-skeleton h-11 w-full" />
        </div>
      </div>

      <dl className="divide-y divide-border rounded-card border border-border bg-surface">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="pp-skeleton h-4 w-40" />
            <div className="pp-skeleton h-4 w-10" />
          </div>
        ))}
      </dl>
    </div>
  )
}
