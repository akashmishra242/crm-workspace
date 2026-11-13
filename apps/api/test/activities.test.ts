import { ACTIVITY_PAGE_SIZE, type ActivityPage } from '@crm/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { contactActivities } from '../src/db/schema'
import { createTestApp, insertContact, type TestContext } from './helpers/test-app'

let ctx: TestContext

beforeAll(async () => {
  ctx = await createTestApp()
})

afterAll(() => ctx.close())

describe('GET /api/v1/contacts/:id/activities', () => {
  it('pages through history newest first', async () => {
    const contact = await insertContact(ctx.db)
    const total = ACTIVITY_PAGE_SIZE + 5
    await ctx.db.insert(contactActivities).values(
      Array.from({ length: total }, (_, index) => ({
        contactId: contact.id,
        type: 'CONTACT_UPDATED' as const,
        payload: { changes: { company: { from: null, to: `Company ${index}` } } },
        createdAt: new Date(Date.UTC(2025, 0, 1, 0, index)),
      })),
    )
    const url = `/api/v1/contacts/${contact.id}/activities`

    const first = (await ctx.app.inject({ method: 'GET', url })).json<ActivityPage>()
    const second = (
      await ctx.app.inject({ method: 'GET', url: `${url}?cursor=${first.nextCursor}` })
    ).json<ActivityPage>()

    const companies = [...first.data, ...second.data].map((activity) =>
      activity.type === 'CONTACT_UPDATED' ? activity.payload.changes.company?.to : undefined,
    )
    expect(first.data).toHaveLength(ACTIVITY_PAGE_SIZE)
    expect(second.nextCursor).toBeNull()
    expect(companies).toEqual(
      Array.from({ length: total }, (_, index) => `Company ${total - 1 - index}`),
    )
    expect(first.data[0]).toMatchObject({ contactId: contact.id, id: expect.any(String) })
  })

  it('answers 404 for an unknown contact', async () => {
    const response = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/contacts/00000000-0000-4000-8000-000000000000/activities',
    })

    expect(response.statusCode).toBe(404)
  })
})
