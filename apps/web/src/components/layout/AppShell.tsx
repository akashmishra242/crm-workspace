import { BarChart3, Users } from 'lucide-react'
import { Suspense, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { useContactsChangedElsewhere } from '../../features/contacts/api/useContactsChangedElsewhere'
import {
  AdvancedFiltersDrawer,
  CreateContactDrawer,
} from '../../features/contacts/list/ContactsPage'
import { QuickSearch } from '../../features/contacts/search/QuickSearch'
import { usePreferenceSync } from '../../features/preferences/usePreferenceSync'
import { UserMenu } from '../../features/users/components/UserMenu'
import { HELP_KEY, useKeyboardShortcut } from '../../hooks/useKeyboardShortcut'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { onNavigation } from '../../lib/appUpdate'
import { lazyWithPreload, whenIdle } from '../../lib/lazyWithPreload'
import { OfflineBanner } from './OfflineBanner'

const ShortcutsDialog = lazyWithPreload(() => import('../../features/help/ShortcutsDialog'))
const SettingsDialog = lazyWithPreload(() => import('../../features/settings/SettingsDialog'))

const NAV_ITEMS = [{ to: '/contacts', label: t.shell.nav.contacts, icon: Users }]

type OpenDialog = 'shortcuts' | 'settings' | null

function Brand({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2 font-semibold', className)}>
      <span className="grid size-7 place-items-center rounded-md bg-primary-600 text-white">
        <BarChart3 className="size-4" aria-hidden />
      </span>
      {t.shell.appName}
    </span>
  )
}

export function AppShell() {
  usePreferenceSync()
  useContactsChangedElsewhere()
  const [dialog, setDialog] = useState<OpenDialog>(null)
  const { pathname } = useLocation()
  const isCurrent = (to: string) => pathname.startsWith(to)

  // A waiting app update is applied on a page change, when nothing is lost by reloading.
  useEffect(() => onNavigation(), [pathname])
  const openShortcuts = () => setDialog('shortcuts')
  const openSettings = () => setDialog('settings')
  const closeDialog = (open: boolean) => !open && setDialog(null)

  // Ctrl+H (⌘/ on a Mac) works even while typing; "?" is the Gmail and GitHub convention;
  // Ctrl+/ stays as an alternative everywhere.
  useKeyboardShortcut(HELP_KEY, openShortcuts, { mod: true, allowInInputs: true })
  useKeyboardShortcut('/', openShortcuts, { mod: true, enabled: HELP_KEY !== '/' })
  useKeyboardShortcut('?', openShortcuts)

  // Once the page is idle, fetch the code for the dialogs, the contact page and the list's
  // drawers, so their first open is instant even from a keyboard shortcut.
  useEffect(() => {
    whenIdle(() => {
      void ShortcutsDialog.preload()
      void SettingsDialog.preload()
      void AdvancedFiltersDrawer.preload()
      void CreateContactDrawer.preload()
      void import('../../features/contacts/detail/ContactDetailPage')
    })
  }, [])

  return (
    <div className="flex h-dvh flex-col lg:flex-row">
      <a
        href="#main"
        className="sr-only z-50 rounded bg-white px-3 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        {t.shell.skipToContent}
      </a>

      <aside className="hidden w-60 shrink-0 flex-col bg-sidebar text-white lg:flex">
        <Brand className="h-16 px-5" />
        <div className="px-3 pb-3">
          <QuickSearch />
        </div>
        <nav aria-label={t.shell.mainNav} className="flex-1 space-y-0.5 px-3">
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
        {/* Settings, shortcuts and history live in one place: the user menu. */}
        <div className="border-t border-white/10 p-3">
          <UserMenu tone="sidebar" onOpenSettings={openSettings} onOpenShortcuts={openShortcuts} />
        </div>
      </aside>

      <header className="flex h-14 shrink-0 items-center gap-2 bg-sidebar px-4 text-white lg:hidden">
        <Brand className="mr-auto" />
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
