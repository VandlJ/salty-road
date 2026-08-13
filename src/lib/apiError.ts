import { NextResponse } from "next/server";

// Response shape and failure types, deliberately free of any dependency on
// auth or the database. They used to live next to withAdmin, which meant that
// importing `conflict()` from a pure helper pulled in adminAuth and through it
// a real Prisma client — enough to fail `npm test` in CI, where there is no
// DATABASE_URL.

/** `{ error: code }` with a status — the response shape every route uses. */
export function errorResponse(code: string, status: number) {
  return NextResponse.json({ error: code }, { status });
}

/**
 * A failure with a specific status, thrown from anywhere inside a handler
 * (including inside a transaction callback) and turned into a response by
 * withAdmin. Replaces the `throw new Error("NOT_FOUND")` + string-matching
 * catch blocks that each route used to carry.
 */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number
  ) {
    super(code);
    this.name = "ApiError";
  }
}

export const notFound = () => new ApiError("not_found", 404);
export const badRequest = (code: string) => new ApiError(code, 400);
export const conflict = (code: string) => new ApiError(code, 409);
