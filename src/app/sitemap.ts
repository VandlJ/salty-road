import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.saltyroad.cz';
  const locales = ['en', 'cs'];
  const routes = ['', '/check', '/shop'];

  const sitemapEntries: MetadataRoute.Sitemap = [];

  locales.forEach((locale) => {
    routes.forEach((route) => {
      // Priority logic:
      // cs home: 1.0, en home: 0.9
      // cs others: 0.8, en others: 0.7
      let priority = 0.8;
      if (route === '') {
        priority = locale === 'cs' ? 1.0 : 0.9;
      } else {
        priority = locale === 'cs' ? 0.8 : 0.7;
      }

      sitemapEntries.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: priority,
      });
    });
  });

  return sitemapEntries;
}
