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
        // Unlisted sign-up route kept alive for Volume 2 — brand new, so it
        // has no inbound links and a disallow can't strand it in the index
        // the way one on /check would.
        '/cs/register',
        '/en/register',
      ],
    },
    sitemap: 'https://www.saltyroad.cz/sitemap.xml',
  };
}
