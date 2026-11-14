import { CLIENT_BUILD_HEADER } from '@crm/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestApp, type TestContext } from './helpers/test-app'

const RELEASE = new Date('2026-11-14T12:00:00Z')
const buildIdAt = (date: Date) => date.getTime().toString(36)

let ctx: TestContext

beforeAll(async () => {
  ctx = await createTestApp({ minClientBuild: RELEASE })
})

afterAll(() => ctx.close())

const getTags = (headers: Record<string, string>) =>
  ctx.app.inject({ method: 'GET', url: '/api/v1/tags', headers })

describe('outdated web builds', () => {
  it('tells builds older than MIN_CLIENT_BUILD to reload with 426', async () => {
    const response = await getTags({
      [CLIENT_BUILD_HEADER]: buildIdAt(new Date('2026-11-13T00:00:00Z')),
    })
    expect(response.statusCode).toBe(426)
    expect(response.json()).toMatchObject({ error: { code: 'CLIENT_OUTDATED' } })
  })

  it('lets current builds and requests without a build header through', async () => {
    const current = await getTags({ [CLIENT_BUILD_HEADER]: buildIdAt(RELEASE) })
    const script = await getTags({})
    expect([current.statusCode, script.statusCode]).toEqual([200, 200])
  })
})
