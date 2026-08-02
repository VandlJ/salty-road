// Split out from adminAuth.ts on purpose — that file imports prisma at
// module scope, so anything importing from it (even just for the cookie
// name / expiry check) drags PrismaClient into the edge middleware bundle,
// where it can't run (same class of bug fixed earlier for shipping.ts).
export const ADMIN_COOKIE_NAME = "admin_token";

// Cheap, edge-safe expiry check only — does NOT verify the token exists in
// the DB (that still happens in getAdminFromReq() on the actual API route).
// This is just enough to redirect an obviously-logged-out visitor away from
// the admin shell before the JS bundle downloads, not the source of truth.
export function tokenExpired(token: string): boolean {
  const expiresAt = Number(token.split(":")[1]);
  return !expiresAt || Date.now() > expiresAt;
}
