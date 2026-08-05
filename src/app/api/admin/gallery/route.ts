import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getAdminFromReq } from "@/lib/adminAuth";
import { getGalleryPhotos, setGalleryPhotos, GALLERY_CACHE_TAG } from "@/lib/gallery";

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
  // Blob URLs only — this array is rendered straight into <Image src> on the
  // homepage, so a javascript: or data: entry has no business being here.
  if (
    !photos.every(
      (url) =>
        typeof url === "string" &&
        url.length <= MAX_URL_LENGTH &&
        url.startsWith("https://")
    )
  ) {
    return NextResponse.json({ error: "invalid_photos" }, { status: 400 });
  }

  await setGalleryPhotos(photos);
  // Push the change to the homepage now rather than after the 60s revalidate.
  // "max" is how long Next remembers the invalidation — it has to outlive the
  // cache entry itself (60s) or a stale entry could resurface after the marker
  // expires.
  revalidateTag(GALLERY_CACHE_TAG, "max");

  return NextResponse.json({ photos });
}
