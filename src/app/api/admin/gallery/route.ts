import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getAdminFromReq } from "@/lib/adminAuth";
import { getGalleryPhotos, setGalleryPhotos, GALLERY_CACHE_TAG, type GalleryPhoto } from "@/lib/gallery";

const MAX_PHOTOS = 500;
const MAX_URL_LENGTH = 500;

// Kept out of /api/admin/settings deliberately: that route's GET is fetched by
// the merch admin on every load, and shipping the whole photo URL array with it
// would be pure waste.
export async function GET() {
  const admin = await getAdminFromReq();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const photos = await getGalleryPhotos();
  return NextResponse.json({ photos });
}

export async function PUT(req: Request) {
  const admin = await getAdminFromReq();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const photos = body?.photos;

  if (!Array.isArray(photos) || photos.length > MAX_PHOTOS) {
    return NextResponse.json({ error: "invalid_photos" }, { status: 400 });
  }
  // Blob URLs only — url is rendered straight into <img src> on the
  // homepage, so a javascript: or data: entry has no business being here.
  // instagram is free text (handle/@handle/URL, normalized at render time),
  // just capped so nothing absurd ends up in the Setting row.
  if (
    !photos.every(
      (p) =>
        p &&
        typeof p.url === "string" &&
        p.url.length <= MAX_URL_LENGTH &&
        p.url.startsWith("https://") &&
        (p.instagram === null || p.instagram === undefined || (typeof p.instagram === "string" && p.instagram.length <= 200))
    )
  ) {
    return NextResponse.json({ error: "invalid_photos" }, { status: 400 });
  }

  const normalized: GalleryPhoto[] = photos.map((p) => ({
    url: p.url,
    instagram: typeof p.instagram === "string" && p.instagram.trim() ? p.instagram : null,
  }));

  await setGalleryPhotos(normalized);
  // Push the change to the homepage now rather than after the 60s revalidate.
  // "max" is how long Next remembers the invalidation — it has to outlive the
  // cache entry itself (60s) or a stale entry could resurface after the marker
  // expires.
  revalidateTag(GALLERY_CACHE_TAG, "max");

  return NextResponse.json({ photos: normalized });
}
