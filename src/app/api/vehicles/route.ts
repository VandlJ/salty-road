import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

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

    const [regs, total] = await Promise.all([
      prisma.registration.findMany({
        where: { status: "accepted" },
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
        where: { status: "accepted" },
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