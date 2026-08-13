import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { getAdminFromReq } from "@/lib/adminAuth";
import { verifyCrewToken, CREW_COOKIE_NAME } from "@/lib/crewAuth";
import { requireCurrentEdition } from "@/lib/edition";
import { RegStatus } from "@/lib/constants";

async function isAuthorized(): Promise<boolean> {
  const cookieStore = await cookies();
  if (verifyCrewToken(cookieStore.get(CREW_COOKIE_NAME)?.value)) return true;
  return !!(await getAdminFromReq());
}

export async function GET() {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    // Door check-in is always about the edition happening now — a past
    // edition's exhibitors must not appear on the crew's board.
    const edition = await requireCurrentEdition();

    const regs = await prisma.registration.findMany({
      where: { editionId: edition.id, status: RegStatus.Accepted },
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
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

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
