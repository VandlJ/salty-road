import type { Metadata, Viewport } from "next";
import { Roboto, Montserrat } from "next/font/google";
import localFont from "next/font/local";
import "../globals.css";
import ClientNavbarWrapper from "@/components/clientNavbarWrapper";
import Footer from "@/components/footer";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { Analytics } from "@vercel/analytics/next";

const roboto = Roboto({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-roboto',
});

const montserrat = Montserrat({
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
  const tReg = await getTranslations({ locale, namespace: 'RegisterPage' });

  const title = `${t('title1')} ${t('title2')}`;
  const description = tReg('subtitle');

  return {
    title: {
      template: `%s | ${title}`,
      default: title,
    },
    description,
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
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body
        className={`${roboto.variable} ${amika.variable} ${montserrat.variable} antialiased min-h-dvh font-roboto flex flex-col`}
      >
        <NextIntlClientProvider messages={messages}>
          <div className="w-full">
            <ClientNavbarWrapper />
          </div>
          <main className="flex-1 flex flex-col overflow-x-hidden">{children}</main>
          <Footer />
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}