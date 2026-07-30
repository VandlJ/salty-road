import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getShopEnabled } from "@/lib/shop";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ShopPage" });
  // The shop is behind an admin-controlled kill switch (off by default) —
  // keep it out of search results until it's actually turned on.
  const enabled = await getShopEnabled();

  return {
    title: t("title"),
    description: t("subtitle"),
    robots: enabled ? undefined : { index: false, follow: false },
  };
}

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
