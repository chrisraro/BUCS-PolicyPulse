/**
 * Route-level loading UI for `/` (Next.js `loading.tsx` — shown automatically
 * during server navigation while the page's data fetches resolve). A static
 * shell mirroring the chat layout (DESIGN.md App shell: persistent sidebar
 * >=1024px, centered chat column, sticky composer), built from `.pp-skeleton`
 * blocks so it reads as "loading", not as a flash of an empty app. No
 * animation beyond the shimmer itself — this is a route transition, not a
 * page-load choreography moment (PRODUCT.md motion register).
 */
export default function Loading() {
  return (
    <div className="flex h-dvh bg-bg text-ink" role="status" aria-label="Loading PolicyPulse">
      <div className="hidden w-[288px] shrink-0 flex-col gap-2 border-r border-border bg-surface p-4 lg:flex">
        <div className="pp-skeleton h-10 w-full" aria-hidden="true" />
        <div className="mt-2 flex flex-col gap-2">
          <div className="pp-skeleton h-10 w-full" aria-hidden="true" />
          <div className="pp-skeleton h-10 w-5/6" aria-hidden="true" />
          <div className="pp-skeleton h-10 w-4/6" aria-hidden="true" />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-border bg-surface px-4 py-3 lg:hidden">
          <div className="pp-skeleton h-8 w-8 rounded-full" aria-hidden="true" />
          <div className="pp-skeleton h-6 w-32" aria-hidden="true" />
        </div>

        <div className="mx-auto flex min-h-0 w-full max-w-[46rem] flex-1 flex-col justify-center gap-4 px-4 py-6 sm:px-6">
          <div className="pp-skeleton h-4 w-2/3" aria-hidden="true" />
          <div className="pp-skeleton h-4 w-full" aria-hidden="true" />
          <div className="pp-skeleton h-4 w-5/6" aria-hidden="true" />
          <div className="pp-skeleton h-4 w-1/2" aria-hidden="true" />
        </div>

        <div className="border-t border-border bg-surface pt-3 pb-[calc(env(safe-area-inset-bottom)_+_0.75rem)]">
          <div className="mx-auto flex w-full max-w-[46rem] items-end gap-2 px-4 sm:px-6">
            <div className="pp-skeleton h-11 flex-1" aria-hidden="true" />
            <div className="pp-skeleton h-11 w-16 shrink-0" aria-hidden="true" />
          </div>
        </div>
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  )
}
