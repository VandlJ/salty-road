import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createAdminToken, adminCookieOptions, ADMIN_COOKIE_NAME } from "@/lib/adminAuth";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(req: Request) {
  try {
    if (!(await rateLimit(`admin-login:${getClientIp(req)}`, 10, 15 * 60 * 1000))) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const { username, password } = await req.json();
    if (!username || !password)
      return NextResponse.json({ error: "missing_credentials" }, { status: 400 });

    const admin = await prisma.admin.findUnique({ where: { username } });
    // Always spend the same ~100ms in bcrypt, so a missing user and a wrong
    // password are indistinguishable from response timing.
    const hash = admin?.password ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin";
    const ok = await bcrypt.compare(password, hash);
    if (!admin || !ok) return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });

    const token = createAdminToken();
    await prisma.admin.update({ where: { id: admin.id }, data: { sessionToken: token } });

    const res = NextResponse.json({ success: true });
    res.cookies.set(ADMIN_COOKIE_NAME, token, adminCookieOptions);
    return res;
  } catch (err) {
    console.error("admin login error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    if (token) {
      await prisma.admin.updateMany({ where: { sessionToken: token }, data: { sessionToken: null } });
    }
    const res = NextResponse.json({ success: true });
    res.cookies.delete(ADMIN_COOKIE_NAME);
    return res;
  } catch (err) {
    console.error("admin logout error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
