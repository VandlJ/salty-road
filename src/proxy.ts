import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { ADMIN_COOKIE_NAME, tokenExpired } from '@/lib/adminTokenEdge';

const intlMiddleware = createMiddleware(routing);

// Matches "/cs/admin/orders", "/en/admin/merch/..." etc. but NOT the bare
// "/cs/admin" hub itself — that route renders its own login form in place
// when logged out (see AdminHubPage), so it doesn't need a redirect.
const ADMIN_SUBPAGE_RE = /^\/(en|cs)\/admin\/.+/;

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (ADMIN_SUBPAGE_RE.test(pathname)) {
    // Cheap, edge-safe check only (no DB round trip) — this exists so a
    // logged-out visitor is redirected before the admin JS bundle and page
    // shell even download, not as the source of truth for authorization.
    // Every admin API route still independently verifies the session
    // against the DB via getAdminFromReq().
    const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (!token || tokenExpired(token)) {
      const locale = pathname.startsWith('/en') ? 'en' : 'cs';
      return NextResponse.redirect(new URL(`/${locale}/admin`, req.url));
    }
  }

  const res = intlMiddleware(req);
  // next-intl's own locale-detection redirect (e.g. "/" → "/cs") defaults to
  // a 307 Temporary Redirect. That's a weaker canonicalization signal for
  // Google than a permanent one — same class of issue as the apex→www
  // domain redirect (see Vercel Domains settings) — so upgrade it to 308
  // here. Preserves every header next-intl set (Location, the NEXT_LOCALE
  // cookie, etc.) — only the status code changes.
  if (res.status === 307 && res.headers.has('location')) {
    return new NextResponse(null, { status: 308, headers: res.headers });
  }
  return res;
}

export const config = {
  // Match only internationalized pathnames
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
