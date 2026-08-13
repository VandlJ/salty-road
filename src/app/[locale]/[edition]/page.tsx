import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import EditionArchive from "@/components/edition-archive";
import { jsonLdScript, canonicalUrl, buildAlternates } from "@/lib/seo";
import { buildEventJsonLd } from "@/lib/eventJsonLd";
import { getEditionBySlug, getArchivedEditions, getCurrentEdition } from "@/lib/edition";
import { toLocale } from "@/i18n/locale";

// Permanent archive page for one past edition, e.g. /cs/vol1.
//
// The homepage shows whichever edition is current; once a newer one takes
// over, the older one keeps its photos, videos and cars here instead of being
// overwritten. Previously the only copy of a finished edition was whatever
// happened to still be on the homepage.
export async function generateStaticParams() {
  const editions = await getArchivedEditions();
  return editions.map((edition) => ({ edition: edition.slug }));
}

// A slug that isn't an archived edition must 404 rather than render an empty
// page — this route sits at the same level as /shop and /privacy, so it would
// otherwise happily answer for any unknown path.
async function loadArchived(slug: string) {
  const edition = await getEditionBySlug(slug);
  if (!edition || edition.status !== "archived") notFound();
  return edition;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; edition: string }>;
}): Promise<Metadata> {
  const { locale, edition: slug } = await params;
  const edition = await loadArchived(slug);
  const t = await getTranslations({ locale: toLocale(locale), namespace: "ArchivePage.meta" });

  // While this edition is still the current one it is also what the homepage
  // renders, so the two URLs serve identical content. Point the canonical at
  // the homepage until a newer edition takes over, at which point this page
  // becomes the only home for that content and canonicals to itself.
  const current = await getCurrentEdition();
  const isOnHomepage = current?.id === edition.id;
  const path = isOnHomepage ? "" : `/${edition.slug}`;

  return {
    title: edition.name,
    description: t("description"),
    alternates: {
      canonical: canonicalUrl(locale, path),
      languages: buildAlternates(path),
    },
    openGraph: { description: t("description") },
  };
}

export default async function EditionArchivePage({
  params,
}: {
  params: Promise<{ locale: string; edition: string }>;
}) {
  const { locale, edition: slug } = await params;
  const edition = await loadArchived(slug);
  const t = await getTranslations({ locale: toLocale(locale), namespace: "ArchivePage" });

  const eventJsonLd = buildEventJsonLd({
    edition,
    locale,
    name: `${t("hero.title1")} ${t("hero.title2")}`,
    description: t("meta.description"),
    path: `/${edition.slug}`,
  });

  return (
    <div className="w-full">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(eventJsonLd) }}
      />
      {/* No "next edition" teaser here — that belongs on the homepage, not on
          every past year's page. */}
      <EditionArchive
        edition={edition}
        vehiclesTitle={t("vehicles.title")}
        showNextEdition={false}
      />
    </div>
  );
}
