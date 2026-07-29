import { createHmac, timingSafeEqual } from "crypto";

export const CREW_COOKIE_NAME = "crew_token";
export const CREW_SESSION_MS = 12 * 60 * 60 * 1000; // 12h, one event day

function getSecret(): string {
  const secret = process.env.ENTRY_SESSION_SECRET;
  if (!secret) throw new Error("ENTRY_SESSION_SECRET not configured");
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function createCrewToken(): string {
  const payload = String(Date.now() + CREW_SESSION_MS);
  return `${payload}.${sign(payload)}`;
}

export function verifyCrewToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  if (Number(payload) < Date.now()) return false;
  try {
    return safeEqual(sig, sign(payload));
  } catch {
    return false;
  }
}

export function verifyPin(pin: string): boolean {
  const expected = process.env.ENTRY_PIN;
  if (!expected || !pin) return false;
  return safeEqual(pin, expected);
}
