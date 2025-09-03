import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const plateRaw = (url.searchParams.get("plate") || "").trim();
    if (!plateRaw) {
      return NextResponse.json({ error: "Missing plate parameter" }, { status: 400 });
    }

    // Normalize license plate: remove spaces and convert to uppercase for consistent search
    const plate = plateRaw.replace(/\s+/g, "").toUpperCase();

    const reg = await prisma.registration.findFirst({
      where: { plate: { equals: plate, mode: "insensitive" } },
      select: { id: true, status: true, name: true, plate: true, createdAt: true },
    });

    if (!reg) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(reg);
  } catch (err) {
    console.error("/api/check error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}