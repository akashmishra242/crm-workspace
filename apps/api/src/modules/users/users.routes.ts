import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import type { Database } from '../../db/client'
import { findUsers } from './users.repository'

export const userRoutes: FastifyPluginAsyncZod<{ db: Database }> = async (app, { db }) => {
  app.get('/users', () => findUsers(db))
}
