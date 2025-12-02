import { PrismaClient } from '@prisma/client'

const globalForPrisma = global

// Configure Prisma for serverless with connection pooling
const prisma = globalForPrisma.prisma || new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Disable prepared statements for connection pooling
  // This fixes the "prepared statement already exists" error
  __internal: {
    engine: {
      connection_limit: 1,
    },
  },
})

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma