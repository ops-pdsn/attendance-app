import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis

// Skip Prisma initialization during build if DATABASE_URL is not available
const prisma = globalForPrisma.prisma ?? (
  !process.env.DATABASE_URL && process.env.NODE_ENV === 'production'
    ? null
    : new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      })
)

if (process.env.NODE_ENV !== 'production' && prisma) {
  globalForPrisma.prisma = prisma
}

export default prisma