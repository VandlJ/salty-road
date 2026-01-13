import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = (url.searchParams.get("id") || "").trim();
    if (!id) {
      return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
    }

    const reg = await prisma.registration.findUnique({
      where: { id },
      select: { 
        id: true, 
        status: true, 
        firstName: true,
        lastName: true,
        brand: true,
        model: true,
        year: true,
        createdAt: true 
      },
    });

    if (!reg) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(reg);
  } catch (err) {
    console.error("/api/check error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
