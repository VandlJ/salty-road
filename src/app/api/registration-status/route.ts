import { NextResponse } from "next/server";
import { getRegistrationOpen } from "@/lib/registration";

export async function GET() {
  const open = await getRegistrationOpen();
  return NextResponse.json({ open });
}
