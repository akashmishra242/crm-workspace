import { assignTagSchema, bulkTagSchema, tagCreateSchema, tagListQuerySchema } from '@crm/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import type { Database } from '../../db/client'
import { contactIdParams, contactTagParams } from '../../lib/route-params'
import { actorIdOf } from '../users/current-user'
import { findTags, insertTag } from './tags.repository'
import { changeContactTag, changeTagInBulk } from './tags.service'

export const tagRoutes: FastifyPluginAsyncZod<{ db: Database }> = async (app, { db }) => {
  app.get('/tags', { schema: { querystring: tagListQuerySchema } }, (request) =>
    findTags(db, request.query.q),
  )

  app.post('/tags', { schema: { body: tagCreateSchema } }, async (request, reply) =>
    reply.code(201).send(await insertTag(db, request.body)),
  )

  app.post(
    '/contacts/:id/tags',
    { schema: { params: contactIdParams, body: assignTagSchema } },
    (request) =>
      changeContactTag(db, {
        contactId: request.params.id,
        tagId: request.body.tagId,
        action: 'add',
        actorId: actorIdOf(request),
      }),
  )

  app.delete('/contacts/:id/tags/:tagId', { schema: { params: contactTagParams } }, (request) =>
    changeContactTag(db, {
      contactId: request.params.id,
      tagId: request.params.tagId,
      action: 'remove',
      actorId: actorIdOf(request),
    }),
  )

  app.post('/contacts/bulk/tags', { schema: { body: bulkTagSchema } }, (request) =>
    changeTagInBulk(db, request.body, actorIdOf(request)),
  )
}
