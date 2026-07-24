import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

function createClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "info"] : [],
  }).$extends(withAccelerate());
}

type ExtendedPrismaClient = ReturnType<typeof createClient>;

declare global {
  // allow global var across module reloads / warm serverless invocations
  var __prismaClient__: ExtendedPrismaClient | undefined;
}

const prisma = global.__prismaClient__ ?? createClient();

global.__prismaClient__ = prisma;

export default prisma;