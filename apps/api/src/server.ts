import type { FastifyServerOptions } from 'fastify'
import { buildApp } from './app'
import { loadEnv, type Env } from './config/env'
import { connectDatabase, connectionOptionsFromEnv } from './db/client'

const env = loadEnv()
const connection = await connectDatabase(connectionOptionsFromEnv(env))
await connection.migrate()

const app = await buildApp({
  db: connection.db,
  corsOrigins: env.CORS_ORIGIN,
  logger: loggerOptions(env),
  minClientBuild: env.MIN_CLIENT_BUILD ? new Date(env.MIN_CLIENT_BUILD) : undefined,
})

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    app.log.info({ signal }, 'Shutting down')
    await app.close()
    await connection.close()
    process.exit(0)
  })
}

await app.listen({ host: env.HOST, port: env.PORT })

function loggerOptions(env: Env): FastifyServerOptions['logger'] {
  if (env.NODE_ENV === 'development') {
    return { level: env.LOG_LEVEL, transport: { target: 'pino-pretty' } }
  }
  return { level: env.LOG_LEVEL }
}
