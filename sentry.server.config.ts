import * as Sentry from "@sentry/nextjs";

// No DSN means Sentry does nothing at all — same convention as
// RESEND_API_KEY in @/lib/email. Local dev, CI and any deploy without the
// variable set run untouched rather than erroring or buffering events.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: !!process.env.SENTRY_DSN,
  // The shop takes a handful of orders a day; there's no volume argument for
  // sampling, and a missed trace is a missed answer when something breaks.
  tracesSampleRate: 1,
  // Order and registration payloads carry names, addresses and e-mails.
  // Nothing here is worth shipping to a third party to debug a stack trace.
  sendDefaultPii: false,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
});
