import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { toast } from 'sonner'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './server'

// Generous waits keep tests stable on a busy CI machine; they return as soon as the UI is ready.
configure({ asyncUtilTimeout: 4_000 })

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  cleanup()
  // Sonner keeps toasts in a module-level store; clear it so tests stay independent.
  toast.dismiss()
  window.localStorage.clear()
})
afterAll(() => server.close())
