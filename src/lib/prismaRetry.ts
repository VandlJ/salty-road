// Retry logic for transient Accelerate connectivity failures, kept free of
// any Prisma import so it can be unit-tested without constructing a client
// (see the note in lib/prisma.ts about that exact mistake breaking `npm
// test` once already).
//
// The incident this exists for: prisma.edition.findFirst() on the homepage
// failed with P5000 wrapping {"code":"P6008", message: "Accelerate was not
// able to connect to your database"} — a Cloudflare-side hop between
// Accelerate and the origin database, gone by the next request. One glitch
// took down every page load until it cleared, because nothing retried.

/** Matches Accelerate's own connectivity/availability codes, not query
 *  errors the database itself returned (those come back as ordinary Prisma
 *  codes like P2002 and must not be retried — a unique-constraint violation
 *  will fail identically the second time). */
const TRANSIENT_PATTERN = /P6008|P5010|P5009|not able to connect to your database|timed out/i;

/**
 * True for a PrismaClientKnownRequestError produced by Accelerate being
 * unable to reach the database, as opposed to one produced by the database
 * itself. Takes a loosely-typed error rather than the real Prisma error
 * class so this file has no Prisma dependency at all — the shape checked
 * here (`code` + `message`) is stable across both.
 */
export function isTransientAccelerateError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: unknown; message?: unknown };
  if (e.code !== "P5000") return false;
  return typeof e.message === "string" && TRANSIENT_PATTERN.test(e.message);
}

/** Read-only operations only. A P6008 means Accelerate never reached the
 *  database, so the query almost certainly never ran — safe to repeat. That
 *  reasoning is far more comfortable for a `findFirst` than for a `create`,
 *  so writes are deliberately left alone rather than risk a double side
 *  effect on a misclassified error. */
export const RETRYABLE_OPERATIONS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "$queryRaw",
  "$queryRawUnsafe",
]);

const RETRY_DELAYS_MS = [150, 500];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs `fn`, retrying up to `RETRY_DELAYS_MS.length` times on a transient
 * failure per `isRetryable`. Any other error, or exhausting the retries,
 * propagates immediately — callers see the same rejection shape as before,
 * just delayed by however many attempts it took.
 */
export async function retryTransient<T>(
  fn: () => Promise<T>,
  isRetryable: (err: unknown) => boolean = isTransientAccelerateError
): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= RETRY_DELAYS_MS.length || !isRetryable(err)) throw err;
      await sleep(RETRY_DELAYS_MS[attempt]);
      attempt++;
    }
  }
}
