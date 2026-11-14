import { BarChart3, History, Keyboard, Users } from 'lucide-react'
import { Suspense, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { useContactsChangedElsewhere } from '../../features/contacts/api/useContactsChangedElsewhere'
import { QuickSearch } from '../../features/contacts/search/QuickSearch'
import { usePreferenceSync } from '../../features/preferences/usePreferenceSync'
import { UserMenu } from '../../features/users/components/UserMenu'
import { MOD_KEY, useKeyboardShortcut } from '../../hooks/useKeyboardShortcut'
import { cn } from '../../lib/cn'
import { lazyWithPreload, whenIdle } from '../../lib/lazyWithPreload'
import { OfflineBanner } from './OfflineBanner'

const ShortcutsDialog = lazyWithPreload(() => import('../../features/help/ShortcutsDialog'))
const SettingsDialog = lazyWithPreload(() => import('../../features/settings/SettingsDialog'))

const BULK_ACTIONS_PATH = '/contacts/bulk-actions'

const NAV_ITEMS = [
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: BULK_ACTIONS_PATH, label: 'Bulk actions', icon: History },
]

type OpenDialog = 'shortcuts' | 'settings' | null

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
  const [dialog, setDialog] = useState<OpenDialog>(null)
  const { pathname } = useLocation()
  // "Contacts" stays highlighted on a contact's page, but not on the bulk actions page.
  const isCurrent = (to: string) =>
    to === BULK_ACTIONS_PATH
      ? pathname.startsWith(BULK_ACTIONS_PATH)
      : pathname.startsWith(to) && !pathname.startsWith(BULK_ACTIONS_PATH)
  const openShortcuts = () => setDialog('shortcuts')
  const openSettings = () => setDialog('settings')
  const closeDialog = (open: boolean) => !open && setDialog(null)

  // "?" is the convention (Gmail, GitHub); Ctrl+/ works on keyboards where "?" needs Shift.
  // Ctrl+H would clash with the browser's history shortcut.
  useKeyboardShortcut('?', openShortcuts)
  useKeyboardShortcut('/', openShortcuts, { mod: true })

  // Once the page is idle, fetch the code for the dialogs so the first open is instant.
  useEffect(() => {
    whenIdle(() => {
      void ShortcutsDialog.preload()
      void SettingsDialog.preload()
    })
  }, [])

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
              aria-current={isCurrent(to) ? 'page' : undefined}
              className={cn(
                'flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
                isCurrent(to)
                  ? 'bg-sidebar-hover text-white'
                  : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-white',
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-2 border-t border-white/10 p-3">
          <button
            type="button"
            onClick={openShortcuts}
            aria-keyshortcuts="? Control+/ Meta+/"
            className="flex h-9 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-sidebar-muted hover:bg-sidebar-hover hover:text-white"
          >
            <Keyboard className="size-4" aria-hidden />
            <span className="flex-1 text-left">Shortcuts</span>
            <kbd className="rounded bg-sidebar px-1.5 font-sans text-[11px]">{MOD_KEY} /</kbd>
          </button>
          <UserMenu tone="sidebar" onOpenSettings={openSettings} onOpenShortcuts={openShortcuts} />
        </div>
      </aside>

      <header className="flex h-14 shrink-0 items-center gap-2 bg-sidebar px-4 text-white lg:hidden">
        <Brand className="mr-auto" />
        <nav aria-label="Main" className="flex items-center gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              aria-label={label}
              aria-current={isCurrent(to) ? 'page' : undefined}
              className={cn(
                'flex h-9 items-center gap-2 rounded-md px-2.5 text-sm font-medium',
                isCurrent(to) ? 'bg-white/10 text-white' : 'text-sidebar-muted hover:text-white',
              )}
            >
              <Icon className="size-4" aria-hidden />
              <span className="hidden md:inline">{label}</span>
            </NavLink>
          ))}
        </nav>
        <QuickSearch variant="icon" />
        <UserMenu tone="header" onOpenSettings={openSettings} onOpenShortcuts={openShortcuts} />
      </header>

      <main id="main" className="flex min-h-0 min-w-0 flex-1 flex-col">
        <OfflineBanner />
        <Outlet />
      </main>

      <Suspense>
        {dialog === 'shortcuts' && <ShortcutsDialog open onOpenChange={closeDialog} />}
        {dialog === 'settings' && <SettingsDialog open onOpenChange={closeDialog} />}
      </Suspense>
    </div>
  )
}
