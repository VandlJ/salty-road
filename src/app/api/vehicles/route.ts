import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const [regs, total] = await Promise.all([
      prisma.registration.findMany({
        where: { status: "accepted" },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          car: true,
          plate: true,
          description: true,
          instagram: true,
          photos: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.registration.count({ where: { status: "accepted" } })
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