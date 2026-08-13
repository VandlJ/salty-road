import * as Sentry from "@sentry/nextjs";

// Browser-side errors — worth having because a JS failure in the checkout
// blocks a sale silently, and nothing else would report it.
//
// NEXT_PUBLIC_ because this value ends up in the client bundle. A DSN is an
// ingest endpoint, not a secret; it's write-only and carries no read access.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1,
  // Session replay is deliberately not enabled: it would record customers
  // typing their address and e-mail into the checkout form.
  sendDefaultPii: false,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
