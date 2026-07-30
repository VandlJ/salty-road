import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  images: {
    // Next.js 16 restricts custom `quality` props to this allowlist (default
    // is just [75]) — without it, any quality={60}/{65} silently clamps back
    // to 75 instead of erroring, which is why those props had no effect.
    qualities: [60, 65, 75],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
