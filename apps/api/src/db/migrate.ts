import { loadEnv } from '../config/env'
import { connectDatabase, connectionOptionsFromEnv } from './client'

const connection = await connectDatabase(connectionOptionsFromEnv(loadEnv()))
await connection.migrate()
await connection.close()
console.info('Migrations applied.')
