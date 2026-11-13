import { USER_ID_HEADER, type ActivityPage, type Contact } from '@crm/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  createTestApp,
  insertContact,
  insertTag,
  insertUser,
  type TestContext,
} from './helpers/test-app'

let ctx: TestContext
let maya: { id: string; name: string; email: string }

beforeAll(async () => {
  ctx = await createTestApp()
  maya = await insertUser(ctx.db, 'Maya Patel', 'maya@example.com')
})

afterAll(() => ctx.close())

function asMaya(method: 'GET' | 'POST' | 'PATCH', url: string, payload?: object) {
  return ctx.app.inject({
    method,
    url: `/api/v1${url}`,
    payload,
    headers: { [USER_ID_HEADER]: maya.id },
  })
}

async function history(contactId: string) {
  const response = await ctx.app.inject({
    method: 'GET',
    url: `/api/v1/contacts/${contactId}/activities`,
  })
  return response.json<ActivityPage>().data
}

describe('who made a change', () => {
  it('records the teammate on edits, tag changes and bulk changes', async () => {
    const contact = await insertContact(ctx.db)
    const tag = await insertTag(ctx.db, 'VIP', 'amber')

    await asMaya('PATCH', `/contacts/${contact.id}`, { version: 1, company: 'Acme' })
    await asMaya('POST', `/contacts/${contact.id}/tags`, { tagId: tag.id })
    await asMaya('POST', '/contacts/bulk/tags', {
      contactIds: [contact.id],
      tagId: tag.id,
      action: 'remove',
    })

    const activities = await history(contact.id)
    expect(activities.map((activity) => activity.type)).toEqual([
      'TAG_REMOVED',
      'TAG_ADDED',
      'CONTACT_UPDATED',
    ])
    for (const activity of activities) {
      expect(activity.actor).toEqual({ id: maya.id, name: 'Maya Patel', email: 'maya@example.com' })
    }
    expect(activities[1]?.payload).toMatchObject({ tagName: 'VIP', tagColor: 'amber' })
  })

  it('attributes created contacts and leaves changes without a header anonymous', async () => {
    const created = await asMaya('POST', '/contacts', { firstName: 'Grace' })
    const contact = created.json<Contact>()
    await ctx.app.inject({
      method: 'PATCH',
      url: `/api/v1/contacts/${contact.id}`,
      payload: { version: 1, lastName: 'Hopper' },
    })

    const [updated, createdActivity] = await history(contact.id)
    expect(updated?.actor).toBeNull()
    expect(createdActivity?.actor?.id).toBe(maya.id)
  })

  it.each(['00000000-0000-4000-8000-000000000000', 'not-a-uuid'])(
    'rejects an unknown user header (%s)',
    async (userId) => {
      const response = await ctx.app.inject({
        method: 'GET',
        url: '/api/v1/contacts',
        headers: { [USER_ID_HEADER]: userId },
      })

      expect(response.statusCode).toBe(401)
      expect(response.json()).toMatchObject({ error: { code: 'UNAUTHENTICATED' } })
    },
  )
})
