import type { Contact, ContactUpdateInput } from '@crm/shared'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { makeContact, makePage, TAGS } from '../../../test/fixtures'
import { renderApp } from '../../../test/renderApp'
import { server } from '../../../test/server'

const contact = makeContact({
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  company: 'Analytical Engines',
})

/** Serves the contact and records every PATCH body; `respond` decides each PATCH reply. */
function mockContactApi(respond: (body: ContactUpdateInput, attempt: number) => Response) {
  const patches: ContactUpdateInput[] = []
  server.use(
    http.get(`*/api/v1/contacts/${contact.id}`, () => HttpResponse.json(contact)),
    http.get(`*/api/v1/contacts/${contact.id}/activities`, () =>
      HttpResponse.json({ data: [], nextCursor: null }),
    ),
    http.get('*/api/v1/contacts', () => HttpResponse.json(makePage([contact]))),
    http.get('*/api/v1/contacts/count', () => HttpResponse.json({ count: 1 })),
    http.get('*/api/v1/tags', () => HttpResponse.json(TAGS)),
    http.patch(`*/api/v1/contacts/${contact.id}`, async ({ request }) => {
      const body = (await request.json()) as ContactUpdateInput
      patches.push(body)
      return respond(body, patches.length)
    }),
  )
  return patches
}

const saved = (changes: Partial<Contact>) =>
  HttpResponse.json({ ...contact, ...changes, version: contact.version + 1 })

async function openContact() {
  const view = renderApp(`/contacts/${contact.id}`)
  const form = await screen.findByRole('form', { name: 'Contact details' })
  return { ...view, form }
}

describe('ContactDetailPage', () => {
  it('saves only the changed fields together with the version they were based on', async () => {
    const patches = mockContactApi((body) => saved({ company: body.company ?? null }))
    const { user, form } = await openContact()

    const company = within(form).getByLabelText('Company')
    await user.clear(company)
    await user.type(company, 'Babbage & Co')
    await user.click(within(form).getByRole('button', { name: /save/i }))

    await waitFor(() => expect(patches).toEqual([{ company: 'Babbage & Co', version: 1 }]))
    expect(await screen.findByText('Changes saved')).toBeInTheDocument()
  })

  it('sends nothing when an edit only changes the formatting', async () => {
    const patches = mockContactApi(() => saved({}))
    const { user, form } = await openContact()

    const phone = within(form).getByLabelText('Phone')
    await user.clear(phone)
    await user.type(phone, '(415) 555-0123')
    await user.click(within(form).getByRole('button', { name: /save/i }))

    expect(await screen.findByText('Nothing to save')).toBeInTheDocument()
    expect(within(form).queryByRole('button', { name: /save/i })).not.toBeInTheDocument()
    expect(patches).toEqual([])
  })

  it('blocks invalid input before it reaches the server', async () => {
    const patches = mockContactApi(() => saved({}))
    const { user, form } = await openContact()

    await user.clear(within(form).getByLabelText('First name'))
    await user.click(within(form).getByRole('button', { name: /save/i }))

    expect(await within(form).findByText('First name is required')).toBeInTheDocument()
    expect(patches).toEqual([])
  })

  it('shows a duplicate email next to the email field', async () => {
    mockContactApi(() =>
      HttpResponse.json(
        {
          error: {
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'Email already in use',
            details: { field: 'email' },
          },
        },
        { status: 409 },
      ),
    )
    const { user, form } = await openContact()

    const email = within(form).getByLabelText('Email')
    await user.clear(email)
    await user.type(email, 'taken@example.com')
    await user.click(within(form).getByRole('button', { name: /save/i }))

    expect(await within(form).findByText('Another contact already uses this email')).toBeVisible()
    expect(email).toHaveAttribute('aria-invalid', 'true')
  })

  it('resolves a stale save with a three-way merge instead of overwriting', async () => {
    const theirs = {
      ...contact,
      email: 'theirs@example.com',
      phone: '+14155550999',
      version: 2,
    }
    const patches = mockContactApi((_body, attempt) =>
      attempt === 1
        ? HttpResponse.json(
            {
              error: {
                code: 'VERSION_CONFLICT',
                message: 'Contact was modified',
                details: { current: theirs },
              },
            },
            { status: 409 },
          )
        : HttpResponse.json({ ...theirs, company: 'Mine Co', version: 3 }),
    )
    const { user, form } = await openContact()

    const email = within(form).getByLabelText('Email')
    await user.clear(email)
    await user.type(email, 'mine@example.com')
    const company = within(form).getByLabelText('Company')
    await user.clear(company)
    await user.type(company, 'Mine Co')
    await user.click(within(form).getByRole('button', { name: /save/i }))

    const dialog = await screen.findByRole('dialog', { name: /changed while you were editing/i })
    expect(within(dialog).getByText('Keeping your change to company.')).toBeInTheDocument()
    expect(within(dialog).getByText('Taking their change to phone.')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('radio', { name: /their saved value/i }))
    await user.click(within(dialog).getByRole('button', { name: 'Save merged version' }))

    await waitFor(() => expect(patches).toHaveLength(2))
    expect(patches[1]).toEqual({ company: 'Mine Co', version: 2 })
    expect(await screen.findByText('Changes saved')).toBeInTheDocument()
  })
})
