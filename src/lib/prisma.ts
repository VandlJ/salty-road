import { PrismaClient } from "@prisma/client";

declare global {
  // allow global var across module reloads in dev
  var __prismaClient__: PrismaClient | undefined;
}

const prisma =
  global.__prismaClient__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "info"] : [],
  });

if (process.env.NODE_ENV === "development") global.__prismaClient__ = prisma;

export default prisma;