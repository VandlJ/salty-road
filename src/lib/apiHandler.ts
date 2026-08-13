import type { Admin } from "@prisma/client";
import { getAdminFromReq } from "@/lib/adminAuth";
import { ApiError, errorResponse } from "@/lib/apiError";

// Re-exported so the many routes that import them from here keep working.
export { ApiError, errorResponse, notFound, badRequest, conflict } from "@/lib/apiError";

// Every admin route opened with the same four lines — fetch the session,
// 401 if absent, and a closing catch that logged "<METHOD> <path> error:"
// and returned a 500. Repeated across 22 route files, it had already drifted:
// the error body said "unauthorized" in 27 places and "Unauthorized" in 10,
// which is a real difference to any client branching on it.

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
