import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/cs/admin',
        '/en/admin',
        '/cs/entry',
        '/en/entry',
      ],
    },
    sitemap: 'https://www.saltyroad.cz/sitemap.xml',
  };
}
