import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { getCurrentEdition, getEditionBySlug } from "@/lib/edition";
import { RegStatus } from "@/lib/constants";

const MAX_LIMIT = 50;

export async function GET(req: Request) {
  if (!(await rateLimit(`vehicles:${getClientIp(req)}`, 120, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  try {
    const url = new URL(req.url);
    // Clamp both, and fall back on NaN — an unbounded or NaN take/skip is
    // either a full-table dump or a 500 from Prisma.
    const rawPage = parseInt(url.searchParams.get("page") || "1", 10);
    const rawLimit = parseInt(url.searchParams.get("limit") || "20", 10);
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), MAX_LIMIT) : 20;
    const skip = (page - 1) * limit;

    // Scoped to one edition, otherwise the first accepted Volume 2 car would
    // show up in Volume 1's archive. An explicit ?edition=<slug> serves the
    // archive routes; without it this answers for the current edition.
    const slug = url.searchParams.get("edition");
    const edition = slug ? await getEditionBySlug(slug) : await getCurrentEdition();
    if (!edition) {
      return NextResponse.json({ error: "edition_not_found" }, { status: 404 });
    }

    const where = { editionId: edition.id, status: RegStatus.Accepted };

    const [regs, total] = await Promise.all([
      prisma.registration.findMany({
        where,
        orderBy: [
          { order: "asc" },
          { createdAt: "desc" }
        ],
        skip,
        take: limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          brand: true,
          model: true,
          year: true,
          description: true,
          instagram: true,
          photos: true,
          status: true,
          createdAt: true,
        },
        cacheStrategy: { ttl: 30 },
      }),
      prisma.registration.count({
        where,
        cacheStrategy: { ttl: 30 },
      })
    ]);

    return NextResponse.json({
      data: regs,
      hasMore: skip + limit < total,
      total,
      page,
      limit
    });
  } catch (err) {
    console.error("/api/vehicles error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}