import { describe, it, expect, vi, beforeEach } from "vitest";

let admin: { username: string } | null = { username: "admin" };
vi.mock("@/lib/adminAuth", () => ({
  getAdminFromReq: vi.fn(() => Promise.resolve(admin)),
}));

const { withAdmin, ApiError, errorResponse, notFound, badRequest, conflict } = await import(
  "@/lib/apiHandler"
);

const request = () => new Request("http://localhost/api/admin/thing");

beforeEach(() => {
  admin = { username: "admin" };
  vi.restoreAllMocks();
});

describe("withAdmin", () => {
  it("runs the handler and passes the resolved admin through", async () => {
    const handler = withAdmin("TEST", async ({ admin }) =>
      Response.json({ who: admin.username })
    );
    const res = await handler(request());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ who: "admin" });
  });

  it("401s without calling the handler when there is no session", async () => {
    admin = null;
    const inner = vi.fn();
    const handler = withAdmin("TEST", async () => {
      inner();
      return Response.json({});
    });

    const res = await handler(request());
    expect(res.status).toBe(401);
    // One spelling everywhere now — this used to be "Unauthorized" in some
    // routes and "unauthorized" in others.
    expect(await res.json()).toEqual({ error: "unauthorized" });
    expect(inner).not.toHaveBeenCalled();
  });

  it("awaits route params and hands them to the handler", async () => {
    const handler = withAdmin<{ id: string }>("TEST", async ({ params }) =>
      Response.json({ id: params.id })
    );
    const res = await handler(request(), { params: Promise.resolve({ id: "abc" }) });
    expect(await res.json()).toEqual({ id: "abc" });
  });

  it("maps a thrown ApiError to its own code and status", async () => {
    const handler = withAdmin("TEST", async () => {
      throw new ApiError("not_cancellable", 409);
    });
    const res = await handler(request());
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "not_cancellable" });
  });

  it("turns an unexpected throw into a logged 500", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = withAdmin("PATCH /api/admin/thing", async () => {
      throw new TypeError("something genuinely broke");
    });

    const res = await handler(request());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "server_error" });
    // The scope is what makes a production 500 greppable back to its route.
    expect(String(error.mock.calls[0]?.[0])).toContain("PATCH /api/admin/thing");
  });

  it("does not log ApiError as a server fault", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = withAdmin("TEST", async () => {
      throw notFound();
    });
    await handler(request());
    expect(error).not.toHaveBeenCalled();
  });
});

describe("error helpers", () => {
  it("errorResponse carries the code and status", async () => {
    const res = errorResponse("invalid_photos", 400);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_photos" });
  });

  it("shorthands produce the expected codes and statuses", () => {
    expect([notFound().code, notFound().status]).toEqual(["not_found", 404]);
    expect([badRequest("invalid_price").code, badRequest("invalid_price").status]).toEqual([
      "invalid_price",
      400,
    ]);
    expect([conflict("sku_taken").code, conflict("sku_taken").status]).toEqual(["sku_taken", 409]);
  });
});
