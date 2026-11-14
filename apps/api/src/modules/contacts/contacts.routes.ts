import {
  contactCreateSchema,
  contactFiltersSchema,
  contactListQuerySchema,
  contactUpdateSchema,
} from '@crm/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import type { Database } from '../../db/client'
import { contactIdParams } from '../../lib/route-params'
import { actorIdOf } from '../users/current-user'
import { countContacts } from './contacts.repository'
import {
  createContact,
  deleteContact,
  getContact,
  listContacts,
  restoreContact,
  updateContact,
} from './contacts.service'

export const contactRoutes: FastifyPluginAsyncZod<{ db: Database }> = async (app, { db }) => {
  app.get('/contacts', { schema: { querystring: contactListQuerySchema } }, (request) =>
    listContacts(db, request.query),
  )

  app.get(
    '/contacts/count',
    { schema: { querystring: contactFiltersSchema } },
    async (request) => ({
      count: await countContacts(db, request.query),
    }),
  )

  app.get('/contacts/:id', { schema: { params: contactIdParams } }, (request) =>
    getContact(db, request.params.id),
  )

  app.post('/contacts', { schema: { body: contactCreateSchema } }, async (request, reply) =>
    reply.code(201).send(await createContact(db, request.body, actorIdOf(request))),
  )

  app.patch(
    '/contacts/:id',
    { schema: { params: contactIdParams, body: contactUpdateSchema } },
    (request) => updateContact(db, request.params.id, request.body, actorIdOf(request)),
  )

  app.delete('/contacts/:id', { schema: { params: contactIdParams } }, async (request, reply) => {
    await deleteContact(db, request.params.id, actorIdOf(request))
    return reply.code(204).send()
  })

  app.post('/contacts/:id/restore', { schema: { params: contactIdParams } }, (request) =>
    restoreContact(db, request.params.id, actorIdOf(request)),
  )
}
