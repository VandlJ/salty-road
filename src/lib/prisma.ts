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

/**
 * The client handed to an interactive `$transaction` callback.
 *
 * Declared here rather than derived from `typeof prisma` at each call site:
 * doing that requires importing the client as a *value*, which instantiates
 * it just to read a type. That broke `npm test` in CI, where there is no
 * DATABASE_URL — a pure unit test that only wanted the type ended up
 * constructing a real client and rejecting.
 *
 * Inferred from $transaction rather than using Prisma.TransactionClient
 * because the extended client (see createClient above) doesn't structurally
 * match that stock type once extensions are applied.
 */
export type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export default prisma;