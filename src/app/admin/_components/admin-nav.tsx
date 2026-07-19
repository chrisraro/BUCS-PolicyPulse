'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import { ThemeToggle } from '@/components/theme-toggle'

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/documents', label: 'Documents' },
  { href: '/admin/settings', label: 'AI Settings' },
  { href: '/admin/feedback', label: 'Feedback' },
  { href: '/admin/escalations', label: 'Escalations' },
] as const

function isActivePath(pathname: string, href: string): boolean {
  return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
}

const linkBase =
  'inline-flex min-h-11 items-center rounded-input font-medium ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface'

/**
 * Admin shell navigation: left nav on >=768px, horizontal scrollable tab bar
 * below a sticky top bar on <768px. "Back to chat" is always visible in both
 * layouts (DESIGN.md admin shell vocabulary).
 */
export function AdminNav({ email }: { email: string }) {
  const pathname = usePathname()

  return (
    <>
      <header className="sticky top-0 z-[var(--z-sticky)] border-b border-border bg-surface md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/" className={cn(linkBase, 'px-2 text-sm text-ink hover:bg-surface-2')}>
            ← Back to chat
          </Link>
          <ThemeToggle />
        </div>
        <nav aria-label="Admin sections" className="flex gap-1 overflow-x-auto px-2 pb-2">
          {NAV_ITEMS.map((item) => {
            const active = isActivePath(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  linkBase,
                  'shrink-0 px-3 text-sm whitespace-nowrap',
                  active
                    ? 'bg-primary-subtle text-primary'
                    : 'text-muted hover:bg-surface-2 hover:text-ink',
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </header>

      <aside className="hidden shrink-0 flex-col border-r border-border bg-surface p-4 md:flex md:w-64">
        <Link href="/" className={cn(linkBase, 'px-2 text-sm text-ink hover:bg-surface-2')}>
          ← Back to chat
        </Link>

        <nav aria-label="Admin sections" className="mt-6 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isActivePath(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  linkBase,
                  'px-3 text-sm',
                  active
                    ? 'bg-primary-subtle text-primary'
                    : 'text-muted hover:bg-surface-2 hover:text-ink',
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
          <span className="truncate text-sm text-muted" title={email}>
            {email}
          </span>
          <ThemeToggle />
        </div>
      </aside>
    </>
  )
}
