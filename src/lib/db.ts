import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  // Client engine (engineType = "client") requires a driver adapter.
  // libSQL runs fully offline (prebuilt binaries ship inside the npm package).
  const adapter = new PrismaLibSql({
    url: process.env.DATABASE_URL ?? 'file:./db/custom.db',
  })
  return new PrismaClient({
    adapter,
    // Verbose query logs only in development; production keeps error logs
    // (avoids log noise and leaking row data into log aggregators).
    log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
