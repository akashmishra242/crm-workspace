import { BarChart3, Users } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import { useContactsChangedElsewhere } from '../../features/contacts/api/useContactsChangedElsewhere'
import { QuickSearch } from '../../features/contacts/search/QuickSearch'
import { ShortcutsDialog } from '../../features/help/ShortcutsDialog'
import { usePreferenceSync } from '../../features/preferences/usePreferenceSync'
import { UserMenu } from '../../features/users/components/UserMenu'
import { cn } from '../../lib/cn'
import { OfflineBanner } from './OfflineBanner'

const NAV_ITEMS = [{ to: '/contacts', label: 'Contacts', icon: Users }]

function Brand({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2 font-semibold', className)}>
      <span className="grid size-7 place-items-center rounded-md bg-primary-600 text-white">
        <BarChart3 className="size-4" aria-hidden />
      </span>
      CRM Workspace
    </span>
  )
}

export function AppShell() {
  usePreferenceSync()
  useContactsChangedElsewhere()

  return (
    <div className="flex h-dvh flex-col lg:flex-row">
      <a
        href="#main"
        className="sr-only z-50 rounded bg-white px-3 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        Skip to content
      </a>

      <aside className="hidden w-60 shrink-0 flex-col bg-sidebar text-white lg:flex">
        <Brand className="h-16 px-5" />
        <div className="px-3 pb-3">
          <QuickSearch />
        </div>
        <nav aria-label="Main" className="flex-1 space-y-0.5 px-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-hover text-white'
                    : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-white',
                )
              }
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-2 border-t border-white/10 p-3">
          <ShortcutsDialog />
          <UserMenu tone="sidebar" />
        </div>
      </aside>

      <header className="flex h-14 shrink-0 items-center justify-between bg-sidebar px-4 text-white lg:hidden">
        <Brand />
        <UserMenu tone="header" />
      </header>

      <main id="main" className="flex min-h-0 min-w-0 flex-1 flex-col">
        <OfflineBanner />
        <Outlet />
      </main>
    </div>
  )
}
