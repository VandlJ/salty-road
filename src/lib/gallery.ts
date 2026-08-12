import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { GalleryPhoto } from "@/lib/galleryPhoto";
import { getCurrentEdition, getEditionBySlug } from "@/lib/edition";

export type { GalleryPhoto } from "@/lib/galleryPhoto";
export { normalizeInstagramUrl } from "@/lib/galleryPhoto";

export const GALLERY_CACHE_TAG = "gallery-photos";

// Event photo gallery — an ordered list of { url, instagram } entries stored
// as JSON on the Edition that owns it, so each year keeps its own set. It
// lived in a single flat `gallery_photos` Setting row until editions existed,
// which meant a second edition would have overwritten the first one's photos.
//
// Still JSON rather than its own table: an ordered list edited wholesale by
// one admin gains nothing from a relation. Trade-off is unchanged — writes are
// last-write-wins over the whole array.

/** Normalises the stored JSON, tolerating the legacy plain-string format. */
export function parseGalleryPhotos(value: Prisma.JsonValue | undefined): GalleryPhoto[] {
  if (!Array.isArray(value)) return [];
  // Tolerates the earlier plain-string-array format too (["url", ...]), so
  // data saved before Instagram tagging stays readable without a backfill.
  return value
    .map((entry): GalleryPhoto | null => {
      if (typeof entry === "string") return { url: entry, instagram: null };
      if (entry && typeof entry === "object" && !Array.isArray(entry)) {
        const url = (entry as Record<string, unknown>).url;
        const instagram = (entry as Record<string, unknown>).instagram;
        if (typeof url === "string") {
          return { url, instagram: typeof instagram === "string" ? instagram : null };
        }
      }
      return null;
    })
    .filter((entry): entry is GalleryPhoto => entry !== null);
}

export async function getGalleryPhotos(editionId: string): Promise<GalleryPhoto[]> {
  const edition = await prisma.edition.findUnique({
    where: { id: editionId },
    select: { galleryPhotos: true },
  });
  return parseGalleryPhotos(edition?.galleryPhotos);
}

export async function setGalleryPhotos(editionId: string, photos: GalleryPhoto[]): Promise<void> {
  await prisma.edition.update({
    where: { id: editionId },
    data: { galleryPhotos: photos },
  });
}

// The homepage and archive pages read this during render — including at build
// time, when Next.js statically prerenders them. A DB that's briefly
// unreachable specifically from the build environment (see the matching
// comment on getShopEnabledCached in @/lib/shop) must not fail the entire
// build over the gallery; an empty gallery just falls back to the "coming
// soon" placeholder state until the next revalidate. A plain uncached read
// would also force the whole page dynamic; the tag lets the admin PUT push a
// change through immediately instead of waiting out the revalidate window.
//
// Keyed by edition slug so each archive page caches separately.
const getGalleryPhotosBySlugUncaught = unstable_cache(
  async (slug: string) => {
    const edition = await getEditionBySlug(slug);
    return edition ? parseGalleryPhotos(edition.galleryPhotos) : [];
  },
  ["gallery-photos"],
  { revalidate: 60, tags: [GALLERY_CACHE_TAG] }
);

export async function getGalleryPhotosCached(slug: string): Promise<GalleryPhoto[]> {
  try {
    return await getGalleryPhotosBySlugUncaught(slug);
  } catch (err) {
    console.error("getGalleryPhotosCached: falling back to empty", err);
    return [];
  }
}

/** The gallery of whichever edition the site is currently about. */
export async function getCurrentGalleryPhotosCached(): Promise<GalleryPhoto[]> {
  try {
    const edition = await getCurrentEdition();
    return edition ? await getGalleryPhotosCached(edition.slug) : [];
  } catch (err) {
    console.error("getCurrentGalleryPhotosCached: falling back to empty", err);
    return [];
  }
}
