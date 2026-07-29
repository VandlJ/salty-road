import { NextResponse } from "next/server";
import { createCrewToken, verifyPin, CREW_COOKIE_NAME, CREW_SESSION_MS } from "@/lib/crewAuth";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    if (!process.env.ENTRY_SESSION_SECRET || !process.env.ENTRY_PIN) {
      console.error("ENTRY_SESSION_SECRET or ENTRY_PIN not configured — crew login unavailable");
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }

    if (!(await rateLimit(`entry-login:${getClientIp(req)}`, 10, 15 * 60 * 1000))) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const { pin } = await req.json();
    if (!verifyPin(String(pin || ""))) {
      return NextResponse.json({ error: "invalid_pin" }, { status: 401 });
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
