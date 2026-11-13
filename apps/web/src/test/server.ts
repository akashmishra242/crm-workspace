import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { TEAMMATE } from './fixtures'

/** Endpoints every page touches; individual tests add the ones they care about. */
export const server = setupServer(
  http.get('*/api/v1/users', () => HttpResponse.json([TEAMMATE])),
  http.get('*/api/v1/me/preferences', () => HttpResponse.json({})),
  // Rows prefetch their contact on hover; tests that open a contact add their own handler.
  http.get('*/api/v1/contacts/:id', () =>
    HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, { status: 404 }),
  ),
  http.put('*/api/v1/me/preferences/:key', async ({ request }) =>
    HttpResponse.json(await request.json()),
  ),
)
