import { bulkActionListQuerySchema } from '@crm/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import type { Database } from '../../db/client'
import { findBulkActionPage } from './bulk-actions.repository'

export const bulkActionRoutes: FastifyPluginAsyncZod<{ db: Database }> = async (app, { db }) => {
  app.get('/bulk-actions', { schema: { querystring: bulkActionListQuerySchema } }, (request) =>
    findBulkActionPage(db, request.query.cursor),
  )
}
