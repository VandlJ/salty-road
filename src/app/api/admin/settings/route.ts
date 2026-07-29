import { NextResponse } from "next/server";
import { getAdminFromReq } from "@/lib/adminAuth";
import { getRegistrationOpen, setRegistrationOpen } from "@/lib/registration";

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
