import { NextResponse } from 'next/server';
import { list, del } from '@vercel/blob';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    if (!process.env.CRON_SECRET) {
      console.error("CRON_SECRET not configured — refusing to run cleanup");
      return new NextResponse('Server misconfigured', { status: 500 });
    }
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 1. Get all blobs, paginating past the 1000-per-call limit so nothing
    // older gets silently skipped once the bucket grows past that.
    const blobs: Awaited<ReturnType<typeof list>>["blobs"] = [];
    let cursor: string | undefined;
    do {
      const page = await list({ limit: 1000, cursor });
      blobs.push(...page.blobs);
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);

    if (blobs.length === 0) {
        return NextResponse.json({ message: "No blobs found" });
    }

    // 2. Get all valid URLs from DB, split by folder — registrations and
    // merch product images are cleaned against different tables.
    const registrationBlobs = blobs.filter(b => b.pathname.startsWith('registrations/'));
    const merchBlobs = blobs.filter(b => b.pathname.startsWith('merch/'));

    const [registrations, merchProducts] = await Promise.all([
      registrationBlobs.length > 0
        ? prisma.registration.findMany({ select: { photos: true } })
        : Promise.resolve([]),
      merchBlobs.length > 0
        ? prisma.merchProduct.findMany({
            select: { photos: true, sizeChartImage: true, variants: { select: { images: true } } },
          })
        : Promise.resolve([]),
    ]);

    const registrationUrls = new Set(registrations.flatMap(r => r.photos));
    const merchUrls = new Set(
      merchProducts.flatMap(p => [
        ...p.photos,
        ...(p.sizeChartImage ? [p.sizeChartImage] : []),
        ...p.variants.flatMap(v => v.images),
      ])
    );

    // 3. Find orphans (same "grace period" logic for both folders — keep
    // anything younger than 24h to avoid a race with an in-progress upload
    // whose DB write hasn't landed yet).
    function findOrphans(candidateBlobs: typeof blobs, validUrls: Set<string>) {
      return candidateBlobs.filter(blob => {
        if (validUrls.has(blob.url)) return false;
        const ageInMs = Date.now() - new Date(blob.uploadedAt).getTime();
        if (ageInMs < 24 * 60 * 60 * 1000) return false;
        return true;
      });
    }

    const orphans = [
      ...findOrphans(registrationBlobs, registrationUrls),
      ...findOrphans(merchBlobs, merchUrls),
    ];

    // 4. Delete orphans
    if (orphans.length > 0) {
      await del(orphans.map(b => b.url));
    }

    return NextResponse.json({
      deleted: orphans.length,
      orphans: orphans.map(b => b.url)
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
