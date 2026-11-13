import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/server.ts', 'src/db/migrate.ts', 'src/db/seed/seed.ts'],
  format: 'esm',
  target: 'node22',
  platform: 'node',
  clean: true,
  // The shared package ships TypeScript source, so it is compiled into the bundle.
  noExternal: ['@crm/shared'],
})
