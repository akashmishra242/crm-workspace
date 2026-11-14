import { buildTime, CLIENT_BUILD_HEADER } from '@crm/shared'
import type { FastifyInstance } from 'fastify'
import { AppError } from '../../errors/app-error'

/**
 * Version skew guard. After an API change that older web builds can't handle, set
 * MIN_CLIENT_BUILD and those builds get 426: the app then reloads into the new version.
 * Requests without the header (scripts, health checks) are never affected.
 */
export function rejectOutdatedClients(app: FastifyInstance, minClientBuild: Date) {
  app.addHook('onRequest', async (request) => {
    const header = request.headers[CLIENT_BUILD_HEADER]
    if (typeof header !== 'string') return
    const builtAt = buildTime(header)
    if (Number.isFinite(builtAt) && builtAt < minClientBuild.getTime()) {
      throw new AppError(
        'CLIENT_OUTDATED',
        426,
        'This version of the app is out of date. Reload to get the latest one.',
      )
    }
  })
}
