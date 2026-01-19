import { NextResponse } from 'next/server';
import { list, del } from '@vercel/blob';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // secure this endpoint (e.g. via CRON_SECRET)
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 1. Get all blobs
    // Limit to 1000 for this batch run
    const { blobs } = await list({ limit: 1000 });

    if (blobs.length === 0) {
        return NextResponse.json({ message: "No blobs found" });
    }

    // 2. Get all valid photo URLs from DB
    // We only need to check blobs that look like our registrations
    const registrationBlobs = blobs.filter(b => b.pathname.startsWith('registrations/'));
    
    if (registrationBlobs.length === 0) {
        return NextResponse.json({ message: "No registration blobs found" });
    }

    // Get all photos from all registrations
    const registrations = await prisma.registration.findMany({
      select: { photos: true }
    });

    const validUrls = new Set(registrations.flatMap(r => r.photos));

    // 3. Find orphans
    const orphans = registrationBlobs.filter(blob => {
      // Keep if it's in the DB
      if (validUrls.has(blob.url)) return false;

      // Keep if it's extremely new (< 24 hours) to avoid race conditions with ongoing uploads
      const ageInMs = Date.now() - new Date(blob.uploadedAt).getTime();
      if (ageInMs < 24 * 60 * 60 * 1000) return false;

      return true;
    });

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
