import { NuqsAdapter } from 'nuqs/adapters/react-router/v7'
import { createBrowserRouter, Link, Navigate, useRouteError, type RouteObject } from 'react-router'
import { AppShell } from './components/layout/AppShell'
import { EmptyState, ErrorState, Skeleton } from './components/ui/States'
import { ContactsPage } from './features/contacts/list/ContactsPage'
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
    <div className="space-y-4 p-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

function RouteErrorPage() {
  const error = useRouteError()
  return (
    <ErrorState
      title="This page crashed"
      message={error instanceof Error ? error.message : 'An unexpected error occurred.'}
      onRetry={() => window.location.reload()}
    />
  )
}

function NotFoundPage() {
  return (
    <EmptyState
      icon={<Compass className="size-5" aria-hidden />}
      title="Page not found"
      description="The page you're looking for doesn't exist."
      action={
        <Link to="/contacts" className="font-medium text-primary-700 hover:underline">
          Go to contacts
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
          {
            path: 'contacts/bulk-actions',
            lazy: async () => {
              const { BulkActionsPage } = await import('./features/bulk-actions/BulkActionsPage')
              return { Component: BulkActionsPage }
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
