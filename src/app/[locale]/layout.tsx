import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import localFont from "next/font/local";
import "../globals.css";
import ClientNavbarWrapper from "@/components/clientNavbarWrapper";
import Footer from "@/components/footer";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

const roboto = Roboto({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-roboto',
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

export const metadata: Metadata = {
  title: "Salty Road",
  description: "",
};

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
        className={`${roboto.variable} ${amika.variable} antialiased min-h-screen font-roboto`}
      >
        <NextIntlClientProvider messages={messages}>
          <div className="w-full">
            <ClientNavbarWrapper />
          </div>
          <main>{children}</main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}