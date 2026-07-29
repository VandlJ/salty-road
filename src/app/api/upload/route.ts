import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import sharp from "sharp";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export async function POST(req: Request) {
  try {
    if (!rateLimit(`upload:${getClientIp(req)}`, 30, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many uploads, try again later" }, { status: 429 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "File too large" }, { status: 413 });
    }

    const isHeicName = /\.(heic|heif)$/i.test(file.name);
    if (file.type && !ALLOWED_TYPES.has(file.type) && !isHeicName) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
    }

    const arrayBuffer = await file.arrayBuffer();
    let buffer: Buffer = Buffer.from(arrayBuffer);
    let fileName = file.name;
    let contentType = file.type || "application/octet-stream";

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
        console.log(`Converting HEIC file: ${fileName}`);
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
          console.log(`Fallback conversion successful for ${fileName}`);
        } catch (fallbackErr) {
           console.error(`Fallback HEIC conversion failed for ${fileName}:`, fallbackErr);
           // Proceeding with original, though it might not view in browser
        }
      }
    }

    const now = Date.now();
    // Use a 'temp' prefix or just standard structure. 
    // We will rely on DB reconciliation to clean up unused files.
    const remotePath = `registrations/${now}_${fileName.replace(/\s+/g, "_")}`;
    
    const blob = await put(remotePath, buffer, {
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
