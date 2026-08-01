import type { Metadata } from "next";
import { buildAlternates, canonicalUrl } from "@/lib/seo";

const TITLE = "Obchodní a reklamační podmínky";
const DESCRIPTION =
  "Obchodní podmínky, reklamační řád a podmínky dodání pro e-shop Salty Road Meet.";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: {
      canonical: canonicalUrl(locale, "/shop/terms"),
      languages: buildAlternates("/shop/terms"),
    },
  };
}

export default function ShopTermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
