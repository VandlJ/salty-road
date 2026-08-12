import { NextResponse } from "next/server";
import type { Admin } from "@prisma/client";
import { getAdminFromReq } from "@/lib/adminAuth";

// Every admin route opened with the same four lines — fetch the session,
// 401 if absent, and a closing catch that logged "<METHOD> <path> error:"
// and returned a 500. Repeated across 22 route files, it had already drifted:
// the error body said "unauthorized" in 27 places and "Unauthorized" in 10,
// which is a real difference to any client branching on it.

/** `{ error: code }` with a status — the response shape every route already used. */
export function errorResponse(code: string, status: number) {
  return NextResponse.json({ error: code }, { status });
}

/**
 * A failure with a specific status, thrown from anywhere inside a handler
 * (including inside a transaction callback) and turned into a response by the
 * wrapper. Replaces the `throw new Error("NOT_FOUND")` + string-matching catch
 * blocks that each route used to carry.
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

type RouteContext<P> = { params: Promise<P> };

/**
 * Wraps an admin-only route handler: resolves and requires the session,
 * converts a thrown ApiError into its status, and turns anything else into a
 * logged 500.
 *
 * `scope` is the log prefix, e.g. "PATCH /api/admin/orders/[id]".
 */
export function withAdmin<P = Record<string, never>>(
  scope: string,
  handler: (args: { req: Request; admin: Admin; params: P }) => Promise<Response>
) {
  return async (req: Request, ctx?: RouteContext<P>): Promise<Response> => {
    const admin = await getAdminFromReq();
    if (!admin) return errorResponse("unauthorized", 401);

    try {
      const params = ctx ? await ctx.params : ({} as P);
      return await handler({ req, admin, params });
    } catch (err) {
      if (err instanceof ApiError) return errorResponse(err.code, err.status);
      console.error(`${scope} error:`, err);
      return errorResponse("server_error", 500);
    }
  };
}
