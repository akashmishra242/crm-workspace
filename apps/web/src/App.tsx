import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { useState } from 'react'
import { RouterProvider } from 'react-router'
import { Toaster } from './components/ui/Toast'
import { TooltipProvider } from './components/ui/Tooltip'
import { createQueryClient, queryPersistOptions } from './lib/queryClient'
import { createRouter } from './router'

export function App() {
  const [queryClient] = useState(createQueryClient)
  const [router] = useState(createRouter)

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={queryPersistOptions}>
      <TooltipProvider delayDuration={300}>
        <RouterProvider router={router} />
        <Toaster />
      </TooltipProvider>
    </PersistQueryClientProvider>
  )
}
