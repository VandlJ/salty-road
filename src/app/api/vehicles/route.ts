import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const regs = await prisma.registration.findMany({
      where: { status: "accepted" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        car: true,
        plate: true,
        description: true,
        photos: true,
        status: true,
        createdAt: true,
      },
    });
    return NextResponse.json(regs);
  } catch (err) {
    console.error("/api/vehicles error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}