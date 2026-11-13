import type { StoredPreference } from '@crm/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setCurrentUserId } from '../../lib/session'
import { preferenceStore } from './preferenceStore'
import { savePreference } from './preferencesApi'

vi.mock('./preferencesApi', () => ({
  savePreference: vi.fn(async (_key: string, write: StoredPreference) => write),
}))

const save = vi.mocked(savePreference)

describe('preferenceStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setCurrentUserId(crypto.randomUUID())
    save.mockClear()
  })
  afterEach(() => vi.useRealTimers())

  it('applies changes immediately and sends one request for a burst of changes', async () => {
    preferenceStore.set('contacts.pageSize', 20)
    preferenceStore.set('contacts.pageSize', 50)
    preferenceStore.set('contacts.pageSize', 100)

    expect(preferenceStore.get('contacts.pageSize')).toBe(100)
    expect(save).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1_000)

    expect(save).toHaveBeenCalledTimes(1)
    expect(save.mock.calls[0]?.[1]).toMatchObject({ value: 100 })
  })

  it('takes the server value when it is newer than the local one', () => {
    preferenceStore.set('contacts.pageSize', 20)
    const later = new Date(Date.now() + 60_000).toISOString()

    preferenceStore.reconcile({ 'contacts.pageSize': { value: 50, updatedAt: later } })

    expect(preferenceStore.get('contacts.pageSize')).toBe(50)
  })

  it('pushes a local change the server has not seen yet', async () => {
    preferenceStore.set('contacts.pageSize', 100)
    const earlier = new Date(Date.now() - 60_000).toISOString()

    preferenceStore.reconcile({ 'contacts.pageSize': { value: 20, updatedAt: earlier } })
    await vi.runAllTimersAsync()

    expect(preferenceStore.get('contacts.pageSize')).toBe(100)
    expect(save).toHaveBeenCalledWith(
      'contacts.pageSize',
      expect.objectContaining({ value: 100 }),
      expect.anything(),
    )
  })

  it('keeps a change made while an earlier save was in flight', async () => {
    let finishFirstSave: (stored: StoredPreference) => void = () => {}
    save.mockImplementationOnce(
      () => new Promise<StoredPreference>((resolve) => (finishFirstSave = resolve)),
    )

    preferenceStore.set('contacts.pageSize', 20)
    await vi.advanceTimersByTimeAsync(1_000)
    const firstWrite = save.mock.calls[0]?.[1] as StoredPreference

    vi.setSystemTime(Date.now() + 5_000)
    preferenceStore.set('contacts.pageSize', 50)
    finishFirstSave(firstWrite)
    await vi.runAllTimersAsync()

    expect(preferenceStore.get('contacts.pageSize')).toBe(50)
    expect(save).toHaveBeenLastCalledWith(
      'contacts.pageSize',
      expect.objectContaining({ value: 50 }),
      expect.anything(),
    )
  })
})
