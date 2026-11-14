import { NuqsAdapter } from 'nuqs/adapters/react-router/v7'
import { createBrowserRouter, Link, Navigate, useRouteError, type RouteObject } from 'react-router'
import { AppShell } from './components/layout/AppShell'
import { EmptyState, ErrorState, Skeleton } from './components/ui/States'
import { ContactsPage } from './features/contacts/list/ContactsPage'
import { t } from './i18n'
import { Compass } from 'lucide-react'

function RootLayout() {
  return (
    <NuqsAdapter>
      <AppShell />
    </NuqsAdapter>
  )
}

/** Shown while a lazy route (opening a contact link directly) loads its code. */
function RouteLoading() {
  return (
    <div className="space-y-4 p-6" aria-busy="true" aria-label={t.states.loading}>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

function RouteErrorPage() {
  const error = useRouteError()
  return (
    <ErrorState
      title={t.states.pageCrashed}
      message={error instanceof Error ? error.message : t.states.unexpectedError}
      onRetry={() => window.location.reload()}
    />
  )
}

function NotFoundPage() {
  return (
    <EmptyState
      icon={<Compass className="size-5" aria-hidden />}
      title={t.states.pageNotFound}
      description={t.states.pageNotFoundDescription}
      action={
        <Link to="/contacts" className="font-medium text-primary-700 hover:underline">
          {t.states.goToContacts}
        </Link>
      }
    />
  )
}

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    hydrateFallbackElement: <RouteLoading />,
    children: [
      {
        errorElement: <RouteErrorPage />,
        children: [
          { index: true, element: <Navigate to="/contacts" replace /> },
          { path: 'contacts', element: <ContactsPage /> },
          // Kept so links to the old page still work.
          { path: 'contacts/bulk-actions', element: <Navigate to="/history/bulk" replace /> },
          {
            path: 'history',
            lazy: async () => {
              const { HistoryPage } = await import('./features/history/HistoryPage')
              return { element: <HistoryPage tab="contacts" /> }
            },
          },
          {
            path: 'history/bulk',
            lazy: async () => {
              const { HistoryPage } = await import('./features/history/HistoryPage')
              return { element: <HistoryPage tab="bulk" /> }
            },
          },
          {
            path: 'contacts/:contactId',
            lazy: async () => {
              const { ContactDetailPage } =
                await import('./features/contacts/detail/ContactDetailPage')
              return { Component: ContactDetailPage }
            },
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]

export const createRouter = () => createBrowserRouter(routes)
