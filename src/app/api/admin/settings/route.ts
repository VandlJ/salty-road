import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { getRegistrationOpen, setRegistrationOpen } from "@/lib/registration";

async function getAdminFromReq() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return null;
  return prisma.admin.findFirst({ where: { sessionToken: token } });
}

export async function GET() {
  const admin = await getAdminFromReq();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const registrationOpen = await getRegistrationOpen();
  return NextResponse.json({ registrationOpen });
}

export async function PATCH(req: Request) {
  const admin = await getAdminFromReq();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (typeof body.registrationOpen !== "boolean") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await setRegistrationOpen(body.registrationOpen);
  return NextResponse.json({ registrationOpen: body.registrationOpen });
}
