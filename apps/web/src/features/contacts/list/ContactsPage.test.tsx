import type { BulkTagInput } from '@crm/shared'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { makeContact, makePage, TAGS } from '../../../test/fixtures'
import { currentSearchParams, renderApp } from '../../../test/renderApp'
import { server } from '../../../test/server'

const ada = makeContact({ firstName: 'Ada', lastName: 'Lovelace' })
const grace = makeContact({ firstName: 'Grace', lastName: 'Hopper', tags: [TAGS[1]!] })

function mockList(respond: (url: URL) => Response | Promise<Response>) {
  const requests: URL[] = []
  server.use(
    http.get('*/api/v1/contacts', ({ request }) => {
      const url = new URL(request.url)
      requests.push(url)
      return respond(url)
    }),
    http.get('*/api/v1/contacts/count', () => HttpResponse.json({ count: 2 })),
    http.get('*/api/v1/tags', () => HttpResponse.json(TAGS)),
  )
  return requests
}

describe('ContactsPage', () => {
  it('lists contacts with the total from the API', async () => {
    mockList(() => HttpResponse.json(makePage([ada, grace])))
    renderApp('/contacts')

    const table = await screen.findByRole('table')
    expect(within(table).getByRole('link', { name: /Ada Lovelace/ })).toBeInTheDocument()
    expect(within(table).getByRole('link', { name: /Grace Hopper/ })).toBeInTheDocument()
    expect(await screen.findByText('2 Contacts')).toBeInTheDocument()
  })

  it('searches after typing stops, writes the URL and restarts from the first page', async () => {
    const requests = mockList(() => HttpResponse.json(makePage([ada])))
    const { user } = renderApp('/contacts?page=3&cursor=abc')
    await screen.findByRole('table')

    await user.type(screen.getByRole('searchbox', { name: /search contacts/i }), 'ada')

    await waitFor(() => expect(requests.at(-1)?.searchParams.get('q')).toBe('ada'))
    const searches = requests.filter((url) => url.searchParams.has('q'))
    expect(searches).toHaveLength(1)
    expect(searches[0]?.searchParams.has('cursor')).toBe(false)
    expect(currentSearchParams().get('q')).toBe('ada')
    expect(currentSearchParams().has('page')).toBe(false)
  })

  it('explains an empty result and lets the user clear the search', async () => {
    mockList((url) => HttpResponse.json(makePage(url.searchParams.has('q') ? [] : [ada])))
    const { user } = renderApp('/contacts?q=nobody')

    expect(await screen.findByText('No contacts match')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear search and filters' }))

    expect(await screen.findByRole('link', { name: /Ada Lovelace/ })).toBeInTheDocument()
    expect(currentSearchParams().has('q')).toBe(false)
  })

  it('shows an error with a retry when the list fails to load', async () => {
    let attempts = 0
    mockList(() => {
      attempts += 1
      return attempts === 1
        ? HttpResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Boom' } }, { status: 500 })
        : HttpResponse.json(makePage([ada]))
    })
    const { user } = renderApp('/contacts')

    expect(await screen.findByText("Couldn't load contacts")).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /try again/i }))

    expect(await screen.findByRole('link', { name: /Ada Lovelace/ })).toBeInTheDocument()
  })

  it('offers a reset when the URL holds filters the API rejects', async () => {
    mockList((url) =>
      url.searchParams.has('createdFrom')
        ? HttpResponse.json(
            {
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Start date must be on or before end date',
              },
            },
            { status: 400 },
          )
        : HttpResponse.json(makePage([ada])),
    )
    const { user } = renderApp('/contacts?from=2026-11-10&to=2026-11-01')

    expect(await screen.findByText("These filters aren't valid")).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reset search and filters' }))

    expect(await screen.findByRole('link', { name: /Ada Lovelace/ })).toBeInTheDocument()
    expect(currentSearchParams().has('from')).toBe(false)
  })

  it('moves one page on a double click of Next', async () => {
    let releaseSecondPage = () => {}
    const secondPage = new Promise<void>((resolve) => (releaseSecondPage = resolve))
    const requests = mockList(async (url) => {
      if (url.searchParams.get('cursor') === 'page-2') {
        await secondPage
        return HttpResponse.json(makePage([grace], { prevCursor: 'back', nextCursor: 'page-3' }))
      }
      return HttpResponse.json(makePage([ada], { nextCursor: 'page-2' }))
    })
    const { user } = renderApp('/contacts')
    await screen.findByRole('link', { name: /Ada Lovelace/ })

    await user.dblClick(screen.getByRole('button', { name: /next/i }))
    releaseSecondPage()

    expect(await screen.findByRole('link', { name: /Grace Hopper/ })).toBeInTheDocument()
    expect(currentSearchParams().get('page')).toBe('2')
    expect(requests.filter((url) => url.searchParams.get('cursor') === 'page-3')).toHaveLength(0)
  })

  it('tags the selected contacts in bulk', async () => {
    mockList(() => HttpResponse.json(makePage([ada, grace])))
    let bulkRequest: BulkTagInput | undefined
    server.use(
      http.post('*/api/v1/contacts/bulk/tags', async ({ request }) => {
        bulkRequest = (await request.json()) as BulkTagInput
        return HttpResponse.json({ updatedCount: 2, unchangedCount: 0, notFoundIds: [] })
      }),
    )
    const { user } = renderApp('/contacts')
    await screen.findByRole('table')

    await user.click(screen.getByRole('checkbox', { name: 'Select Ada Lovelace' }))
    await user.click(screen.getByRole('checkbox', { name: 'Select Grace Hopper' }))
    const bulkBar = screen.getByRole('region', { name: 'Bulk actions' })
    expect(within(bulkBar).getByText('2 contacts selected')).toBeInTheDocument()

    await user.click(within(bulkBar).getByRole('button', { name: /add tag/i }))
    await user.click(await screen.findByRole('option', { name: 'VIP' }))

    await waitFor(() =>
      expect(bulkRequest).toEqual({
        contactIds: [ada.id, grace.id],
        tagId: TAGS[2]!.id,
        action: 'add',
      }),
    )
    expect(await screen.findByText('Tagged 2 contacts with “VIP”')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Bulk actions' })).not.toBeInTheDocument()
  })

  it('toggles rows on click once something is selected, and clears with Esc', async () => {
    mockList(() => HttpResponse.json(makePage([ada, grace])))
    const { user } = renderApp('/contacts')
    const table = await screen.findByRole('table')

    await user.click(screen.getByRole('checkbox', { name: 'Select Ada Lovelace' }))
    await user.click(within(table).getByText(grace.email ?? ''))

    expect(screen.getByRole('checkbox', { name: 'Select Grace Hopper' })).toBeChecked()
    expect(window.location.pathname).toBe('/contacts')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('region', { name: 'Bulk actions' })).not.toBeInTheDocument()
  })

  it('moves through rows with the arrow keys and selects with Space', async () => {
    mockList(() => HttpResponse.json(makePage([ada, grace])))
    const { user } = renderApp('/contacts')
    await screen.findByRole('table')

    await user.click(screen.getByRole('searchbox', { name: /search contacts/i }))
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('link', { name: /Ada Lovelace/ })).toHaveFocus()

    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('link', { name: /Grace Hopper/ })).toHaveFocus()

    await user.keyboard(' ')
    expect(screen.getByRole('checkbox', { name: 'Select Grace Hopper' })).toBeChecked()
  })

  it('opens "Add contact" with N', async () => {
    mockList(() => HttpResponse.json(makePage([ada])))
    const { user } = renderApp('/contacts')
    await screen.findByRole('table')

    await user.keyboard('n')

    expect(await screen.findByRole('dialog', { name: 'Add contact' })).toBeInTheDocument()
  })

  it('opens the shortcut list with ?', async () => {
    mockList(() => HttpResponse.json(makePage([ada])))
    const { user } = renderApp('/contacts')
    await screen.findByRole('table')

    await user.keyboard('?')

    expect(await screen.findByRole('dialog', { name: 'Keyboard shortcuts' })).toBeInTheDocument()
  })
})
