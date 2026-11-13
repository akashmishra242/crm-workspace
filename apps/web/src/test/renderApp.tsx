import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { Toaster } from '../components/ui/Toast'
import { TooltipProvider } from '../components/ui/Tooltip'
import { routes } from '../router'

/** Renders the real app routes at `url`, the same way the browser would load them. */
export function renderApp(url: string) {
  window.history.replaceState(null, '', url)
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const router = createBrowserRouter(routes)

  return {
    user: userEvent.setup(),
    ...render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <RouterProvider router={router} />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>,
    ),
  }
}

export const currentSearchParams = () => new URLSearchParams(window.location.search)
