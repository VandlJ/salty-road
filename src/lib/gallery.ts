import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";

const GALLERY_PHOTOS_KEY = "gallery_photos";

export const GALLERY_CACHE_TAG = "gallery-photos";

// Event photo gallery — an ordered list of Vercel Blob URLs, stored as JSON in
// a single Setting row rather than its own table. The whole data model is "an
// ordered list of URLs", which is exactly what AdminPhotoGalleryManager already
// speaks (string[] in, string[] out), so a relational model would only add a
// migration against production Postgres plus a mapping layer in both
// directions. The trade-off: no per-photo metadata (caption, photographer
// credit) without a later migration, and writes are last-write-wins over the
// whole array — fine for a single admin.
export async function getGalleryPhotos(): Promise<string[]> {
  const setting = await prisma.setting.findUnique({
    where: { key: GALLERY_PHOTOS_KEY },
  });
  if (!setting?.value) return [];

  try {
    const parsed = JSON.parse(setting.value);
    if (!Array.isArray(parsed)) return [];
    // Tolerates both ["url", ...] and [{ url }, ...] so a future upgrade to
    // per-photo objects doesn't need a data backfill to stay readable here.
    return parsed
      .map((entry) =>
        typeof entry === "string"
          ? entry
          : typeof entry?.url === "string"
            ? entry.url
            : null
      )
      .filter((url): url is string => url !== null);
  } catch {
    // A hand-edited or truncated value shouldn't take the homepage down.
    console.error("Malformed gallery_photos setting, treating as empty");
    return [];
  }
}

export async function setGalleryPhotos(photos: string[]): Promise<void> {
  const value = JSON.stringify(photos);
  await prisma.setting.upsert({
    where: { key: GALLERY_PHOTOS_KEY },
    update: { value },
    create: { key: GALLERY_PHOTOS_KEY, value },
  });
}

// The homepage reads this during render. A plain uncached read would force the
// whole page dynamic (same reasoning as getShopEnabledCached in @/lib/shop);
// the tag lets the admin PUT push a change through immediately instead of
// waiting out the revalidate window.
export const getGalleryPhotosCached = unstable_cache(getGalleryPhotos, ["gallery-photos"], {
  revalidate: 60,
  tags: [GALLERY_CACHE_TAG],
});
