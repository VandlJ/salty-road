import * as Sentry from "@sentry/nextjs";

// One place that reports a failure, so a caught error isn't only a line in a
// log nobody reads.
//
// This matters most for the failures that are deliberately swallowed: order
// and registration e-mails are sent inside after() and wrapped in try/catch
// so a Resend outage can't fail the order itself. That's the right trade —
// but it meant an outage looked exactly like everything working, with the
// customer's confirmation and the shop's notification both quietly gone.
//
// Without SENTRY_DSN this degrades to the console.error it replaces, which is
// what local dev and CI get.
export function logError(
  scope: string,
  err: unknown,
  context?: Record<string, unknown>
) {
  console.error(`${scope}:`, err, context ?? "");

  Sentry.captureException(err, {
    tags: { scope },
    // Deliberately kept to ids and counts by every caller — order and
    // registration payloads carry names, addresses and e-mail addresses.
    extra: context,
  });
}
