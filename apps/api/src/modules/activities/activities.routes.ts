import { activityFeedQuerySchema, activityListQuerySchema } from '@crm/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import type { Database } from '../../db/client'
import { notFound } from '../../errors/app-error'
import { contactIdParams } from '../../lib/route-params'
import { contactExists } from '../contacts/contacts.repository'
import { findActivityFeed, findActivityPage } from './activities.repository'

export const activityRoutes: FastifyPluginAsyncZod<{ db: Database }> = async (app, { db }) => {
  app.get(
    '/contacts/:id/activities',
    { schema: { params: contactIdParams, querystring: activityListQuerySchema } },
    async (request) => {
      if (!(await contactExists(db, request.params.id))) throw notFound('Contact')
      return findActivityPage(db, request.params.id, request.query.cursor)
    },
  )

  app.get('/activities', { schema: { querystring: activityFeedQuerySchema } }, (request) =>
    findActivityFeed(db, request.query),
  )
}
