import { NextResponse } from "next/server";
import { createCrewToken, verifyPin, CREW_COOKIE_NAME, CREW_SESSION_MS } from "@/lib/crewAuth";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    if (!rateLimit(`entry-login:${getClientIp(req)}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many attempts, try again later" }, { status: 429 });
    }

    const { pin } = await req.json();
    if (!verifyPin(String(pin || ""))) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
    }

    const res = NextResponse.json({ success: true });
    res.cookies.set(CREW_COOKIE_NAME, createCrewToken(), {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: CREW_SESSION_MS / 1000,
    });
    return res;
  } catch (err) {
    console.error("entry login error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete(CREW_COOKIE_NAME);
  return res;
}
