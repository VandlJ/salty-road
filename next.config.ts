import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs';

const withNextIntl = createNextIntlPlugin();

// Report-Only for now (see Final_Launch_Audit.md S1) — check the browser
// console / a CSP report endpoint on production for violations before
// switching the header name to the enforcing 'Content-Security-Policy'.
const CSP = [
  "default-src 'self'",
  // Next.js injects inline bootstrap scripts; 'unsafe-inline' is required
  // unless this moves to a nonce-based setup in the proxy/middleware.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  // i.ytimg.com serves the video thumbnails on the archive page; the embed
  // itself is framed from youtube-nocookie.com (see frame-src below).
  "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://i.ytimg.com",
  "font-src 'self' data:",
  // The hero loop is served either from /public or from Blob storage, once
  // an edition has one chosen in /admin/hero. Stated explicitly rather than
  // inherited from default-src so widening that later can't silently allow
  // third-party media.
  "media-src 'self' https://*.public.blob.vercel-storage.com",
  "connect-src 'self' https://vitals.vercel-insights.com https://*.ingest.sentry.io https://*.ingest.de.sentry.io",
  "frame-src https://www.youtube-nocookie.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const nextConfig: NextConfig = {
  // Font + logo assets for invoice PDF generation are read via
  // fs.readFileSync at runtime (@/lib/invoice.ts) — Next's build-time file
  // tracing doesn't always pick up dynamically-constructed fs paths, so
  // they're pinned explicitly to ship with both serverless functions that
  // generate invoices (mark-as-paid, and the on-demand admin download).
  //
  // /api/upload gets the same treatment for sharp's native libvips binary:
  // Turbopack's output file tracer has a known bug (lovell/sharp#4567) where
  // it traces @img/sharp-linux-x64 but not its sibling
  // @img/sharp-libvips-linux-x64, so libvips-cpp.so never ships with the
  // deployed function (ERR_DLOPEN_FAILED). Fixed upstream in Next 16.3, kept
  // here too as a safety net since this class of nft bug has recurred.
  outputFileTracingIncludes: {
    "/api/admin/orders/[id]": ["./src/assets/fonts/**", "./src/assets/invoice-logo.png"],
    "/api/admin/orders/[id]/invoice": ["./src/assets/fonts/**", "./src/assets/invoice-logo.png"],
    "/api/upload": ["./node_modules/@img/sharp-libvips-linux-x64/**"],
  },
  images: {
    // Next.js 16 restricts custom `quality` props to this allowlist (default
    // is just [75]) — without it, any quality={60}/{65} silently clamps back
    // to 75 instead of erroring, which is why those props had no effect.
    qualities: [60, 65, 75, 90],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          { key: 'Content-Security-Policy-Report-Only', value: CSP },
        ],
      },
    ];
  },
};

// Source maps so a production stack trace points at real code rather than
// minified output. Uploading them needs SENTRY_AUTH_TOKEN at build time;
// without it the build still succeeds, just without readable traces.
export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  // Keeps the uploaded maps out of the deployed bundle, so they aren't
  // downloadable by visitors.
  sourcemaps: { deleteSourcemapsAfterUpload: true },
  // Proxies Sentry's ingest through the app's own origin, so ad blockers
  // don't silently drop browser error reports.
  tunnelRoute: "/monitoring",
});
