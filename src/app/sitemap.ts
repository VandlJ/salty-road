import { MetadataRoute } from 'next';
import { getShopEnabled } from '@/lib/shop';
import prisma from '@/lib/prisma';
import { SITE_URL, LOCALES } from '@/lib/seo';

// Fixed per-deployment rather than per-request — a static page's content
// only actually changes on a new deploy, so "now" on every crawl would just
// be noise (the thing lastModified is supposed to signal).
const BUILD_DATE = new Date();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // /shop is behind an admin-controlled kill switch — only list it (and its
  // products) once it's actually turned on (matches the noindex on the shop
  // layouts).
  const shopEnabled = await getShopEnabled();

  const products = shopEnabled
    ? await prisma.merchProduct.findMany({
        where: { active: true },
        select: { slug: true, createdAt: true },
      })
    : [];
  const productSlugs = products.map((p) => p.slug);
  // No updatedAt column on MerchProduct — createdAt is still a real,
  // meaningful signal (better than reporting "now" on every single crawl).
  const productModifiedAt = new Map(products.map((p) => [p.slug, p.createdAt]));

  const routes = [
    '',
    '/check',
    '/privacy',
    '/shop/terms',
    ...(shopEnabled ? ['/shop', ...productSlugs.map((slug) => `/shop/${slug}`)] : []),
  ];

  const sitemapEntries: MetadataRoute.Sitemap = [];

  routes.forEach((route) => {
    // Priority logic: cs home highest, en home slightly lower, everything
    // else lower still (products lowest of the indexable routes).
    const isProduct = route.startsWith('/shop/') && route !== '/shop/terms';
    const isHome = route === '';

    LOCALES.forEach((locale) => {
      let priority = 0.8;
      if (isHome) priority = locale === 'cs' ? 1.0 : 0.9;
      else if (isProduct) priority = locale === 'cs' ? 0.6 : 0.5;
      else priority = locale === 'cs' ? 0.8 : 0.7;

      // Reciprocal hreflang alternates — every locale's entry lists the
      // other locale's URL for the same route, so crawlers (Google, Bing,
      // Seznam) know these are translations of each other rather than
      // separate/duplicate pages.
      const languages: Record<string, string> = {};
      LOCALES.forEach((altLocale) => {
        languages[altLocale] = `${SITE_URL}/${altLocale}${route}`;
      });
      languages['x-default'] = `${SITE_URL}/cs${route}`;

      const productSlug = isProduct ? route.slice('/shop/'.length) : null;
      const lastModified = productSlug
        ? (productModifiedAt.get(productSlug) ?? BUILD_DATE)
        : BUILD_DATE;

      sitemapEntries.push({
        url: `${SITE_URL}/${locale}${route}`,
        lastModified,
        changeFrequency: isProduct ? 'daily' : 'weekly',
        priority,
        alternates: { languages },
      });
    });
  });

  return sitemapEntries;
}
