import { defineConfig, env } from 'prisma/config'
import { PrismaLibSql } from '@prisma/adapter-libsql'

// Prisma 6 "JS engine" (WASM, no native engine downloads) + libSQL driver
// adapter so `prisma generate` and the runtime work fully offline from npm.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  experimental: { adapter: true },
  engine: 'js',
  adapter: async () => new PrismaLibSql({ url: env('DATABASE_URL') }),
})
