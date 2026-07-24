import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const regs = await prisma.registration.findMany({
      where: { status: "accepted" },
      orderBy: [
        { order: "asc" },
        { createdAt: "desc" }
      ],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        brand: true,
        model: true,
        year: true,
        paymentStatus: true,
        arrived: true,
        arrivedAt: true,
      },
    });

    return NextResponse.json(regs);
  } catch (err) {
    console.error("/api/entry GET error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, arrived } = body;

    if (!id || typeof arrived !== "boolean") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const updated = await prisma.registration.update({
      where: { id },
      data: { arrived, arrivedAt: arrived ? new Date() : null },
      select: {
        id: true,
        arrived: true,
        arrivedAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("/api/entry PATCH error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
