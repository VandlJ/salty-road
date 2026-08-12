import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import sharp from "sharp";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { getAdminFromReq } from "@/lib/adminAuth";

// HEIC fallback conversion + full-res sharp resizing (gallery uploads) can
// take longer than the platform's 15s default on a large phone photo —
// past that, Vercel kills the function outright (the client just sees a
// bare 500, nothing our own try/catch below ever gets a chance to run).
export const maxDuration = 60;

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const ALLOWED_FOLDERS = new Set(["registrations", "merch", "gallery"]);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const requestedFolder = formData.get("folder");
    const folder =
      typeof requestedFolder === "string" && ALLOWED_FOLDERS.has(requestedFolder)
        ? requestedFolder
        : "registrations";

    // "registrations" is the only folder the public writes to (the vehicle
    // sign-up form) — everything else is admin-only. Phrased as a denylist of
    // one rather than an allowlist so adding a folder can't accidentally leave
    // it publicly writable, which is what a `folder === "merch"` check here
    // would have done.
    const admin = folder !== "registrations" ? await getAdminFromReq() : null;
    if (folder !== "registrations" && !admin) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // The public registrations path is rate-limited against abuse; an
    // authenticated admin batch-importing an event photo gallery is a
    // legitimate burst that shouldn't hit the same cap (30/hour was tuned for
    // one person filling out a form, not a 30-photo album upload).
    const limit = admin ? 300 : 30;
    if (!(await rateLimit(`upload:${getClientIp(req)}`, limit, 60 * 60 * 1000))) {
      return NextResponse.json({ error: "Too many uploads, try again later" }, { status: 429 });
    }

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "File too large" }, { status: 413 });
    }

    const isHeicName = /\.(heic|heif)$/i.test(file.name);
    if (!ALLOWED_TYPES.has(file.type) && !isHeicName) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
    }

    const arrayBuffer = await file.arrayBuffer();
    let buffer: Buffer = Buffer.from(arrayBuffer);
    let fileName = file.name;
    // Never trust the client-supplied MIME string as-is — only pass through
    // values that already passed the ALLOWED_TYPES check above.
    let contentType = ALLOWED_TYPES.has(file.type) ? file.type : "application/octet-stream";

    // Helper to detect HEIC by magic bytes (content)
    const isHeicBuffer = (buf: Buffer) => {
      if (!buf || buf.length < 12) return false;
      // Check for 'ftyp' at offset 4
      if (buf[4] !== 0x66 || buf[5] !== 0x74 || buf[6] !== 0x79 || buf[7] !== 0x70) return false;
      
      const brand = buf.toString('utf8', 8, 12).toLowerCase();
      return ['heic', 'heix', 'heim', 'heis', 'hevc', 'hevm', 'hevs', 'mif1', 'msf1'].includes(brand);
    };

    // Server-side HEIC detection
    const isHeic = isHeicBuffer(buffer) ||
                   fileName.toLowerCase().endsWith(".heic") || 
                   fileName.toLowerCase().endsWith(".heif") || 
                   contentType === "image/heic";

    if (isHeic) {
      try {
        buffer = (await sharp(buffer)
          .rotate()
          .toFormat("jpeg", { quality: 90 })
          .toBuffer()) as unknown as Buffer;
        
        fileName = fileName.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg");
        if (!fileName.toLowerCase().endsWith(".jpg")) fileName += ".jpg";
        contentType = "image/jpeg";
      } catch (err) {
        console.error(`Sharp conversion failed for ${fileName}, trying fallback:`, err);
        try {
          const heicConvert = (await import('heic-convert')).default || (await import('heic-convert'));
          buffer = (await heicConvert({
            buffer: buffer as unknown as ArrayBufferLike,
            format: 'JPEG',
            quality: 0.9
          })) as unknown as Buffer;
          fileName = fileName.replace(/\.heic$/i, ".jpg").replace(/\.heif$/i, ".jpg");
          contentType = "image/jpeg";
        } catch (fallbackErr) {
           console.error(`Fallback HEIC conversion failed for ${fileName}:`, fallbackErr);
           // Proceeding with original, though it might not view in browser
        }
      }
    }

    // Gallery photos are served straight from Blob as plain <img> tags on
    // the homepage (fixed-height horizontal carousel — see
    // EventGallerySection), bypassing next/image's usual automatic
    // resizing/AVIF/WebP re-encoding entirely. Without this, a photo shot at
    // ~4000px tall got shipped in full to display in a ~250-300px-tall row —
    // the WebP reformat alone doesn't fix that, only capping the actual
    // pixel dimensions does. 1000px covers the tallest row size (md:h-72 =
    // 288px) at 3x pixel density with headroom; `withoutEnlargement` leaves
    // already-small source photos alone. Scoped to this one folder so
    // merch/registrations keep their existing (already-working) behavior.
    if (folder === "gallery") {
      try {
        buffer = (await sharp(buffer)
          .rotate()
          .resize({ height: 1000, withoutEnlargement: true })
          .toFormat("webp", { quality: 80 })
          .toBuffer()) as unknown as Buffer;
        fileName = fileName.replace(/\.[a-zA-Z0-9]+$/, "") + ".webp";
        contentType = "image/webp";
      } catch (err) {
        console.error(`WebP conversion failed for ${fileName}, uploading original:`, err);
      }
    }

    const now = Date.now();
    // We rely on DB reconciliation to clean up unused files (see
    // /api/cron/cleanup for the registrations folder).
    const remotePath = `${folder}/${now}_${fileName.replace(/\s+/g, "_")}`;

    // sharp's/heic-convert's output Buffer can end up backed by a
    // SharedArrayBuffer under Vercel's runtime — undici's fetch (used
    // internally by @vercel/blob's put()) rejects that outright with
    // "SharedArrayBuffer is not allowed". Buffer.from() here copies into a
    // fresh, guaranteed-non-shared ArrayBuffer.
    const uploadBuffer = Buffer.from(buffer);

    const blob = await put(remotePath, uploadBuffer, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: contentType,
    });

    return NextResponse.json(blob);
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
