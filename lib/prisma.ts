import { PrismaClient } from "@prisma/client";

// Next.js dev servers hot-reload modules, which would create a new PrismaClient
// on every reload and exhaust database connections. Keep one instance on
// globalThis so it survives reloads.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
