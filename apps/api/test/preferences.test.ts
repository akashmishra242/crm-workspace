import { USER_ID_HEADER, type PreferenceMap, type StoredPreference, type User } from '@crm/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestApp, insertUser, type TestContext } from './helpers/test-app'

let ctx: TestContext
let userId: string

beforeAll(async () => {
  ctx = await createTestApp()
  await insertUser(ctx.db, 'Sofia García', 'sofia@example.com')
  userId = (await insertUser(ctx.db, 'Arjun Rao', 'arjun@example.com')).id
})

afterAll(() => ctx.close())

function savePageSize(value: number, updatedAt: string) {
  return ctx.app.inject({
    method: 'PUT',
    url: '/api/v1/me/preferences/contacts.pageSize',
    headers: { [USER_ID_HEADER]: userId },
    payload: { value, updatedAt },
  })
}

describe('GET /api/v1/users', () => {
  it('lists teammates by name', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/api/v1/users' })

    expect(response.json<User[]>().map((user) => user.name)).toEqual(['Arjun Rao', 'Sofia García'])
  })
})

describe('preferences', () => {
  it('requires a teammate', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/api/v1/me/preferences' })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toMatchObject({ error: { code: 'UNAUTHENTICATED' } })
  })

  it('stores a preference and returns it with the rest', async () => {
    const saved = await savePageSize(50, '2026-01-01T10:00:00.000Z')
    const all = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/me/preferences',
      headers: { [USER_ID_HEADER]: userId },
    })

    expect(saved.json<StoredPreference>()).toEqual({
      value: 50,
      updatedAt: '2026-01-01T10:00:00.000Z',
    })
    expect(all.json<PreferenceMap>()).toEqual({
      'contacts.pageSize': { value: 50, updatedAt: '2026-01-01T10:00:00.000Z' },
    })
  })

  it('keeps the newer value when an older write arrives late', async () => {
    await savePageSize(100, '2026-01-01T12:00:00.000Z')
    const late = await savePageSize(20, '2026-01-01T11:00:00.000Z')

    expect(late.statusCode).toBe(200)
    expect(late.json<StoredPreference>()).toEqual({
      value: 100,
      updatedAt: '2026-01-01T12:00:00.000Z',
    })
  })

  it('rejects timestamps from the future, so a fast clock cannot win every write', async () => {
    const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    const response = await savePageSize(50, nextYear)

    expect(response.statusCode).toBe(400)
  })

  it('rejects unknown keys', async () => {
    const response = await ctx.app.inject({
      method: 'PUT',
      url: '/api/v1/me/preferences/theme',
      headers: { [USER_ID_HEADER]: userId },
      payload: { value: 'dark', updatedAt: '2026-01-01T10:00:00.000Z' },
    })

    expect(response.statusCode).toBe(400)
  })
})
