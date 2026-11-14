import {
  USER_ID_HEADER,
  type ActivityFeedPage,
  type ActivityPage,
  type BulkActionPage,
  type Contact,
} from '@crm/shared'
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

  it('keeps who created a contact and who changed it last on the contact itself', async () => {
    const created = (await asMaya('POST', '/contacts', { firstName: 'Katherine' })).json<Contact>()
    expect(created).toMatchObject({ createdBy: maya.id, updatedBy: maya.id })

    await ctx.app.inject({
      method: 'PATCH',
      url: `/api/v1/contacts/${created.id}`,
      payload: { version: 1, lastName: 'Johnson' },
    })
    const edited = (await asMaya('GET', `/contacts/${created.id}`)).json<Contact>()
    expect(edited).toMatchObject({ createdBy: maya.id, updatedBy: null })
  })

  it('lists changes to every contact, newest first, filtered by kind and teammate', async () => {
    const created = (
      await asMaya('POST', '/contacts', { firstName: 'Dorothy', lastName: 'Vaughan' })
    ).json<Contact>()
    await ctx.app.inject({
      method: 'PATCH',
      url: `/api/v1/contacts/${created.id}`,
      payload: { version: 1, company: 'NACA' },
    })

    const all = (await asMaya('GET', '/activities')).json<ActivityFeedPage>()
    expect(all.data[0]).toMatchObject({ type: 'CONTACT_UPDATED', contactName: 'Dorothy Vaughan' })
    expect(all.data[1]).toMatchObject({ type: 'CONTACT_CREATED', contactId: created.id })

    const mayasCreations = (
      await asMaya('GET', `/activities?type=CONTACT_CREATED&actorId=${maya.id}`)
    ).json<ActivityFeedPage>()
    expect(mayasCreations.data.every((item) => item.type === 'CONTACT_CREATED')).toBe(true)
    expect(mayasCreations.data.every((item) => item.actor?.id === maya.id)).toBe(true)
    expect(mayasCreations.data.map((item) => item.contactName)).toContain('Dorothy Vaughan')
  })

  it('logs each bulk request with its result and author', async () => {
    const [first, second] = [await insertContact(ctx.db), await insertContact(ctx.db)]
    const tag = await insertTag(ctx.db, 'Newsletter', 'teal')
    const missing = '00000000-0000-4000-8000-000000000001'
    await asMaya('POST', '/contacts/bulk/tags', {
      contactIds: [first.id, second.id, missing],
      tagId: tag.id,
      action: 'add',
    })

    const log = (await asMaya('GET', '/bulk-actions')).json<BulkActionPage>()
    expect(log.data[0]).toMatchObject({
      action: 'add',
      tag: { id: tag.id, name: 'Newsletter', color: 'teal' },
      requestedCount: 3,
      updatedCount: 2,
      unchangedCount: 0,
      notFoundCount: 1,
      actor: { id: maya.id, name: 'Maya Patel' },
      status: 'completed',
    })
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
