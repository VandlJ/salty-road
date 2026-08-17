import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import EditionArchive from "@/components/edition-archive";
import EditionUpcoming from "@/components/edition-upcoming";
import { jsonLdScript } from "@/lib/seo";
import { buildEventJsonLd } from "@/lib/eventJsonLd";
import { requireCurrentEdition } from "@/lib/edition";
import { toLocale } from "@/i18n/locale";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: toLocale(locale), namespace: "ArchivePage.meta" });
  const description = t("description");
  const title = t("title");

  // `absolute` bypasses the layout's `%s | Salty Road Meet Volume 1`
  // template, which would otherwise append the site name to a title that
  // already contains it.
  //
  // The homepage sets its own title rather than inheriting the layout's
  // default ("Salty Road Meet Volume 1"), because that default names the
  // brand and nothing else — not what the event is, not where it is. This is
  // the page that has to answer a search for a car meet in Prachatice, and
  // the title is the strongest on-page signal it has.
  return {
    title: { absolute: title },
    description,
    openGraph: { title, description },
  };
}

// The homepage follows whichever edition the site is currently on, and which
// composition it renders is a branch on that edition's status — not a file
// swap. Archiving Volume 1 previously meant overwriting this file and stashing
// the old version in src/templates/ to paste back for Volume 2.
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale: toLocale(locale), namespace: "ArchivePage" });

  const edition = await requireCurrentEdition();

  const eventJsonLd = buildEventJsonLd({
    edition,
    locale,
    name: `${t("hero.title1")} ${t("hero.title2")}`,
    description: t("meta.description"),
    path: "",
  });

  return (
    <div className="w-full">
      {/* Translated strings come from messages/*.json, not user input, but
          jsonLdScript's "</" escaping is applied to every JSON-LD block on
          the site regardless of source. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(eventJsonLd) }}
      />
      {edition.status === "archived" ? (
        <EditionArchive edition={edition} vehiclesTitle={t("vehicles.title")} />
      ) : (
        <EditionUpcoming edition={edition} />
      )}
    </div>
  );
}
