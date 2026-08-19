import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
import { retryTransient, RETRYABLE_OPERATIONS } from "@/lib/prismaRetry";

function createClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "info"] : [],
  })
    .$extends(withAccelerate())
    .$extends({
      name: "retryTransientAccelerateErrors",
      query: {
        // A single glitch on the Accelerate-to-database hop (Cloudflare
        // error 1016, seen in production) otherwise fails every read on the
        // page in one shot — see lib/prismaRetry.ts for the incident and why
        // only read operations are retried.
        $allOperations: ({ operation, args, query }) =>
          RETRYABLE_OPERATIONS.has(operation)
            ? retryTransient(() => query(args))
            : query(args),
      },
    });
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
