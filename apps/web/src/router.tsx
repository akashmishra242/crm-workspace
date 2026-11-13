import { NuqsAdapter } from 'nuqs/adapters/react-router/v7'
import { createBrowserRouter, Link, Navigate, useRouteError, type RouteObject } from 'react-router'
import { AppShell } from './components/layout/AppShell'
import { EmptyState, ErrorState } from './components/ui/States'
import { ContactsPage } from './features/contacts/list/ContactsPage'
import { Compass } from 'lucide-react'

function RootLayout() {
  return (
    <NuqsAdapter>
      <AppShell />
    </NuqsAdapter>
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
    children: [
      {
        errorElement: <RouteErrorPage />,
        children: [
          { index: true, element: <Navigate to="/contacts" replace /> },
          { path: 'contacts', element: <ContactsPage /> },
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
