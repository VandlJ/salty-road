import type { Metadata, Viewport } from "next";
import { Roboto, Montserrat } from "next/font/google";
import localFont from "next/font/local";
import "../globals.css";
import ClientNavbarWrapper from "@/components/clientNavbarWrapper";
import Footer from "@/components/footer";
import PageTransition from "@/components/page-transition";
import ContactWidget from "@/components/contact-widget";
import MotionConfigProvider from "@/components/motion-config-provider";
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { buildAlternates, jsonLdScript, ORGANIZATION_JSON_LD, WEBSITE_JSON_LD, SITE_URL } from "@/lib/seo";
import { routing } from "@/i18n/routing";
import { getShopEnabledCached } from "@/lib/shop";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const roboto = Roboto({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-roboto',
});

const montserrat = Montserrat({
  // Only ever used with font-semibold (see hero.tsx) — no default weight
  // set means next/font pulls the full weight range otherwise.
  weight: ['600'],
  subsets: ['latin'],
  variable: '--font-montserrat',
});

const amika = localFont({
  src: [
    {
      path: '../fonts/Amika_Blackletter.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../fonts/Amika_Blackletter.woff',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../fonts/Amika_Blackletter.ttf',
      weight: '400',
      style: 'normal',
    }
  ],
  variable: '--font-amika',
  display: 'swap',
});

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Hero' });

  const title = `${t('title1')} ${t('title2')}`;
  // Dedicated SEO copy, deliberately not the RegisterForm section's UI
  // subtitle ("Vyplňte formulář níže...") — a meta description doesn't have
  // to match visible page content, and Google was ignoring that one anyway
  // (falling back to scraping the arrival-instructions text off the page)
  // because it wasn't relevant to what people actually search for.
  const description = t('metaDescription');

  return {
    title: {
      template: `%s | ${title}`,
      default: title,
    },
    description,
    alternates: {
      canonical: `${SITE_URL}/${locale}`,
      languages: buildAlternates(''),
    },
    // Seznam.cz Webmaster Tools site-ownership verification.
    other: {
      "seznam-wmt": "POKAANCNVw0nzcBxekQjJZbi58sEKzYb",
    },
    openGraph: {
      title,
      description,
      url: 'https://www.saltyroad.cz',
      siteName: title,
      locale,
      type: 'website',
      images: [
        {
          url: '/OG_image.jpg',
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/OG_image.jpg'],
    },
    metadataBase: new URL('https://www.saltyroad.cz'),
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  // Enables static rendering — getMessages()/getTranslations() below use
  // the ambient request locale, which next-intl otherwise reads via a
  // dynamic API (headers()) and that opts the whole route out of static
  // generation. Must be called before any of those, in every static
  // page/layout that wants prerendering.
  setRequestLocale(locale);
  const messages = await getMessages();
  const shopEnabled = await getShopEnabledCached();

  return (
    <html lang={locale} data-scroll-behavior="smooth">
      <body
        className={`${roboto.variable} ${amika.variable} ${montserrat.variable} antialiased min-h-dvh font-roboto flex flex-col`}
      >
        {/* Fully hardcoded data, but jsonLdScript's "</" escaping is applied
            uniformly across every JSON-LD block on the site regardless of
            source. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(ORGANIZATION_JSON_LD) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(WEBSITE_JSON_LD) }}
        />
        <NextIntlClientProvider messages={messages}>
          <MotionConfigProvider>
            <div className="w-full">
              <ClientNavbarWrapper initialShopVisible={shopEnabled} />
            </div>
            <PageTransition>{children}</PageTransition>
            <Footer />
            <ContactWidget />
          </MotionConfigProvider>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}