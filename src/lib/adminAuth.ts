import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

export const ADMIN_COOKIE_NAME = "admin_token";
export const ADMIN_SESSION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function createAdminToken(): string {
  const expiresAt = Date.now() + ADMIN_SESSION_MS;
  return `${randomUUID()}:${expiresAt}`;
}

function tokenExpired(token: string): boolean {
  const expiresAt = Number(token.split(":")[1]);
  return !expiresAt || Date.now() > expiresAt;
}

export async function getAdminFromReq() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token || tokenExpired(token)) return null;
  return prisma.admin.findFirst({ where: { sessionToken: token } });
}

export const adminCookieOptions = {
  httpOnly: true,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: ADMIN_SESSION_MS / 1000,
};
