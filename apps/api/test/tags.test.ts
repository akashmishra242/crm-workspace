import { BULK_TAG_LIMIT, type BulkTagResult, type Contact, type Tag } from '@crm/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  activitiesOf,
  createTestApp,
  insertContact,
  insertTag,
  type TestContext,
} from './helpers/test-app'

let ctx: TestContext

beforeAll(async () => {
  ctx = await createTestApp()
})

afterAll(() => ctx.close())

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000'

function inject(method: 'GET' | 'POST' | 'DELETE', url: string, payload?: object) {
  return ctx.app.inject({ method, url: `/api/v1${url}`, payload })
}

async function tagActivityTypes(contactId: string) {
  const activities = await activitiesOf(ctx.db, contactId)
  return activities.map((activity) => activity.type)
}

describe('tag catalogue', () => {
  it('creates tags and rejects case-insensitive duplicates', async () => {
    const created = await inject('POST', '/tags', { name: 'Webinar', color: 'blue' })
    const duplicate = await inject('POST', '/tags', { name: 'WEBINAR' })

    expect(created.statusCode).toBe(201)
    expect(created.json<Tag>()).toMatchObject({ name: 'Webinar', color: 'blue' })
    expect(duplicate.statusCode).toBe(409)
    expect(duplicate.json()).toMatchObject({
      error: { code: 'TAG_ALREADY_EXISTS', details: { field: 'name' } },
    })
  })

  it('lists tags by name, optionally filtered', async () => {
    await insertTag(ctx.db, 'Alpha')
    await insertTag(ctx.db, 'Beta')

    const response = await inject('GET', '/tags?q=ph')

    expect(response.json<Tag[]>().map((tag) => tag.name)).toEqual(['Alpha'])
  })
})

describe('single-contact tags', () => {
  it('adds and removes idempotently, logging only real changes and keeping the version', async () => {
    const contact = await insertContact(ctx.db)
    const tag = await insertTag(ctx.db, 'Lead')
    const url = `/contacts/${contact.id}/tags`

    const added = await inject('POST', url, { tagId: tag.id })
    await inject('POST', url, { tagId: tag.id })
    const removed = await inject('DELETE', `${url}/${tag.id}`)
    await inject('DELETE', `${url}/${tag.id}`)

    expect(added.json<Tag[]>()).toEqual([{ id: tag.id, name: 'Lead', color: 'gray' }])
    expect(removed.json<Tag[]>()).toEqual([])
    expect(await tagActivityTypes(contact.id)).toEqual(['TAG_ADDED', 'TAG_REMOVED'])
    const latest = await inject('GET', `/contacts/${contact.id}`)
    expect(latest.json<Contact>().version).toBe(1)
  })

  it('answers 404 for an unknown contact or tag', async () => {
    const contact = await insertContact(ctx.db)
    const tag = await insertTag(ctx.db, 'Orphan')

    const unknownContact = await inject('POST', `/contacts/${UNKNOWN_ID}/tags`, { tagId: tag.id })
    const unknownTag = await inject('POST', `/contacts/${contact.id}/tags`, { tagId: UNKNOWN_ID })

    expect(unknownContact.statusCode).toBe(404)
    expect(unknownTag.statusCode).toBe(404)
    expect(unknownTag.json()).toMatchObject({
      error: { code: 'NOT_FOUND', message: 'Tag not found' },
    })
  })
})

describe('POST /api/v1/contacts/bulk/tags', () => {
  it('tags many contacts once, reporting unchanged and unknown ids', async () => {
    const tag = await insertTag(ctx.db, 'Bulk VIP')
    const [first, second, alreadyTagged] = await Promise.all([
      insertContact(ctx.db),
      insertContact(ctx.db),
      insertContact(ctx.db),
    ])
    await inject('POST', `/contacts/${alreadyTagged.id}/tags`, { tagId: tag.id })
    const contactIds = [first.id, second.id, alreadyTagged.id, UNKNOWN_ID, first.id]

    const firstRun = await inject('POST', '/contacts/bulk/tags', {
      contactIds,
      tagId: tag.id,
      action: 'add',
    })
    const secondRun = await inject('POST', '/contacts/bulk/tags', {
      contactIds,
      tagId: tag.id,
      action: 'add',
    })

    expect(firstRun.json<BulkTagResult>()).toEqual({
      updatedCount: 2,
      unchangedCount: 1,
      notFoundIds: [UNKNOWN_ID],
    })
    expect(secondRun.json<BulkTagResult>()).toMatchObject({ updatedCount: 0, unchangedCount: 3 })
    const [activity] = await activitiesOf(ctx.db, first.id)
    expect(activity).toMatchObject({
      type: 'TAG_ADDED',
      payload: { tagId: tag.id, tagName: 'Bulk VIP', source: 'bulk' },
    })
  })

  it('removes a tag from many contacts', async () => {
    const tag = await insertTag(ctx.db, 'Bulk Remove')
    const contact = await insertContact(ctx.db)
    await inject('POST', `/contacts/${contact.id}/tags`, { tagId: tag.id })

    const response = await inject('POST', '/contacts/bulk/tags', {
      contactIds: [contact.id],
      tagId: tag.id,
      action: 'remove',
    })

    expect(response.json<BulkTagResult>()).toEqual({
      updatedCount: 1,
      unchangedCount: 0,
      notFoundIds: [],
    })
    expect(await tagActivityTypes(contact.id)).toEqual(['TAG_ADDED', 'TAG_REMOVED'])
  })

  it('validates the batch size and the tag', async () => {
    const tag = await insertTag(ctx.db, 'Bounds')
    const tooMany = Array.from({ length: BULK_TAG_LIMIT + 1 }, () => crypto.randomUUID())

    const empty = await inject('POST', '/contacts/bulk/tags', {
      contactIds: [],
      tagId: tag.id,
      action: 'add',
    })
    const oversized = await inject('POST', '/contacts/bulk/tags', {
      contactIds: tooMany,
      tagId: tag.id,
      action: 'add',
    })
    const unknownTag = await inject('POST', '/contacts/bulk/tags', {
      contactIds: [UNKNOWN_ID],
      tagId: UNKNOWN_ID,
      action: 'add',
    })

    expect(empty.statusCode).toBe(400)
    expect(oversized.statusCode).toBe(400)
    expect(unknownTag.statusCode).toBe(404)
  })
})
