import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    if (!username || !password)
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });

    const admin = await prisma.admin.findUnique({ where: { username } });
    if (!admin) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const token = randomUUID();
    await prisma.admin.update({ where: { id: admin.id }, data: { sessionToken: token } });

    const res = NextResponse.json({ success: true });
    res.cookies.set("admin_token", token, { httpOnly: true, path: "/", sameSite: "lax" });
    return res;
  } catch (err) {
    console.error("admin login error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}