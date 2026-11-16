import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { toast } from 'sonner'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from './server'

// Generous waits keep tests stable on a busy CI machine; they return as soon as the UI is ready.
configure({ asyncUtilTimeout: 4_000 })

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(async () => {
  server.resetHandlers()
  cleanup()
  // Sonner keeps toasts in a module-level store; clear it so tests stay independent.
  toast.dismiss()
  window.localStorage.clear()
  // The preference store keeps an in-memory copy too; without this, a setting changed in one
  // test would still be on in the next test of the same file. Imported here rather than at
  // the top so it is the copy the test file loaded, with that file's vi.mock calls applied.
  const { preferenceStore } = await import('../features/preferences/preferenceStore')
  preferenceStore.reload()
})
afterAll(() => server.close())
