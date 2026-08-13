import * as Sentry from "@sentry/nextjs";

// The proxy/middleware runs on the edge runtime and needs its own init.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: !!process.env.SENTRY_DSN,
  tracesSampleRate: 1,
  sendDefaultPii: false,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
});
