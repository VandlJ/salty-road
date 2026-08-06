import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";
import type { GalleryPhoto } from "@/lib/galleryPhoto";

export type { GalleryPhoto } from "@/lib/galleryPhoto";
export { normalizeInstagramUrl } from "@/lib/galleryPhoto";

const GALLERY_PHOTOS_KEY = "gallery_photos";

export const GALLERY_CACHE_TAG = "gallery-photos";

// Event photo gallery — an ordered list of { url, instagram } entries, stored
// as JSON in a single Setting row rather than its own table. A relational
// model would only have bought a migration against production Postgres for a
// data shape this simple. Trade-off: writes are last-write-wins over the
// whole array — fine for a single admin.
export async function getGalleryPhotos(): Promise<GalleryPhoto[]> {
  const setting = await prisma.setting.findUnique({
    where: { key: GALLERY_PHOTOS_KEY },
  });
  if (!setting?.value) return [];

  try {
    const parsed = JSON.parse(setting.value);
    if (!Array.isArray(parsed)) return [];
    // Tolerates the earlier plain-string-array format too (["url", ...]),
    // so the pre-Instagram-tagging data already saved doesn't need a
    // backfill migration to stay readable.
    return parsed
      .map((entry): GalleryPhoto | null => {
        if (typeof entry === "string") return { url: entry, instagram: null };
        if (typeof entry?.url === "string") {
          return {
            url: entry.url,
            instagram: typeof entry.instagram === "string" ? entry.instagram : null,
          };
        }
        return null;
      })
      .filter((entry): entry is GalleryPhoto => entry !== null);
  } catch {
    // A hand-edited or truncated value shouldn't take the homepage down.
    console.error("Malformed gallery_photos setting, treating as empty");
    return [];
  }
}

export async function setGalleryPhotos(photos: GalleryPhoto[]): Promise<void> {
  const value = JSON.stringify(photos);
  await prisma.setting.upsert({
    where: { key: GALLERY_PHOTOS_KEY },
    update: { value },
    create: { key: GALLERY_PHOTOS_KEY, value },
  });
}

// The homepage reads this during render — including at build time, when
// Next.js statically prerenders the page. A DB that's briefly unreachable
// specifically from the build environment (see the matching comment on
// getShopEnabledCached in @/lib/shop) must not fail the entire build over
// the gallery; an empty gallery just falls back to the "coming soon"
// placeholder state until the next revalidate. A plain uncached read would
// also force the whole page dynamic; the tag lets the admin PUT push a
// change through immediately instead of waiting out the revalidate window.
const getGalleryPhotosUncaught = unstable_cache(getGalleryPhotos, ["gallery-photos"], {
  revalidate: 60,
  tags: [GALLERY_CACHE_TAG],
});

export async function getGalleryPhotosCached(): Promise<GalleryPhoto[]> {
  try {
    return await getGalleryPhotosUncaught();
  } catch (err) {
    console.error("getGalleryPhotosCached: falling back to empty", err);
    return [];
  }
}
