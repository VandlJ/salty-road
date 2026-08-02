import { randomUUID, createHash } from "crypto";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { ADMIN_COOKIE_NAME, tokenExpired } from "@/lib/adminTokenEdge";

export { ADMIN_COOKIE_NAME };
export const ADMIN_SESSION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function createAdminToken(): string {
  const expiresAt = Date.now() + ADMIN_SESSION_MS;
  return `${randomUUID()}:${expiresAt}`;
}

// Only the hash is ever stored — a leaked DB dump then contains no usable
// session, unlike storing the cookie value verbatim.
export function hashAdminToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function getAdminFromReq() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token || tokenExpired(token)) return null;

  const session = await prisma.adminSession.findUnique({
    where: { tokenHash: hashAdminToken(token) },
    include: { admin: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return session.admin;
}

export const adminCookieOptions = {
  httpOnly: true,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: ADMIN_SESSION_MS / 1000,
};
