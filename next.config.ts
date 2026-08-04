import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

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
  "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com",
  "font-src 'self' data:",
  "connect-src 'self' https://vitals.vercel-insights.com",
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
  outputFileTracingIncludes: {
    "/api/admin/orders/[id]": [
      "./src/assets/fonts/**",
      "./src/assets/invoice-logo.png",
      "./src/app/fonts/Amika_Blackletter.ttf",
    ],
    "/api/admin/orders/[id]/invoice": [
      "./src/assets/fonts/**",
      "./src/assets/invoice-logo.png",
      "./src/app/fonts/Amika_Blackletter.ttf",
    ],
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

export default withNextIntl(nextConfig);
