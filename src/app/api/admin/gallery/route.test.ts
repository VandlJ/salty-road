import { describe, it, expect, vi, beforeEach } from "vitest";

let settingStore: Record<string, string>;

vi.mock("@/lib/prisma", () => ({
  default: {
    setting: {
      findUnique: vi.fn(({ where: { key } }: { where: { key: string } }) =>
        Promise.resolve(key in settingStore ? { key, value: settingStore[key] } : null)
      ),
      upsert: vi.fn(({ where: { key }, create }: { where: { key: string }; create: { value: string } }) => {
        settingStore[key] = create.value;
        return Promise.resolve({ key, value: settingStore[key] });
      }),
    },
  },
}));

let isAdmin = true;
vi.mock("@/lib/adminAuth", () => ({
  getAdminFromReq: vi.fn(() => Promise.resolve(isAdmin ? { username: "admin" } : null)),
}));

// revalidateTag throws outside a request context, and unstable_cache would
// otherwise memoise reads across cases in this file.
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  unstable_cache: <T>(fn: T) => fn,
}));

const { GET, PUT } = await import("./route");

function putRequest(body: unknown) {
  return new Request("http://localhost/api/admin/gallery", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const URL_A = "https://blob.example.com/gallery/a.jpg";
const URL_B = "https://blob.example.com/gallery/b.jpg";

beforeEach(() => {
  settingStore = {};
  isAdmin = true;
});

describe("GET /api/admin/gallery", () => {
  it("rejects an unauthenticated request", async () => {
    isAdmin = false;
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns an empty list when nothing has been uploaded yet", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).photos).toEqual([]);
  });

  it("survives a malformed stored value instead of throwing", async () => {
    settingStore["gallery_photos"] = "not json{";
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).photos).toEqual([]);
  });
});

describe("PUT /api/admin/gallery", () => {
  it("rejects an unauthenticated request", async () => {
    isAdmin = false;
    const res = await PUT(putRequest({ photos: [URL_A] }));
    expect(res.status).toBe(401);
  });

  it("round-trips an ordered list", async () => {
    const res = await PUT(putRequest({ photos: [URL_A, URL_B] }));
    expect(res.status).toBe(200);
    expect((await res.json()).photos).toEqual([URL_A, URL_B]);

    const read = await GET();
    expect((await read.json()).photos).toEqual([URL_A, URL_B]);
  });

  it("accepts an empty list (deleting the last photo)", async () => {
    settingStore["gallery_photos"] = JSON.stringify([URL_A]);
    const res = await PUT(putRequest({ photos: [] }));
    expect(res.status).toBe(200);
    expect((await GET().then((r) => r.json())).photos).toEqual([]);
  });

  it("rejects a non-array photos field", async () => {
    const res = await PUT(putRequest({ photos: "nope" }));
    expect(res.status).toBe(400);
  });

  it("rejects a non-string element", async () => {
    const res = await PUT(putRequest({ photos: [URL_A, 42] }));
    expect(res.status).toBe(400);
  });

  it("rejects a non-https URL", async () => {
    // These URLs are rendered straight into <Image src> on the homepage.
    const res = await PUT(putRequest({ photos: ["javascript:alert(1)"] }));
    expect(res.status).toBe(400);
  });

  it("rejects more photos than the cap allows", async () => {
    const res = await PUT(putRequest({ photos: Array(501).fill(URL_A) }));
    expect(res.status).toBe(400);
  });

  it("leaves the stored value untouched when validation fails", async () => {
    settingStore["gallery_photos"] = JSON.stringify([URL_A]);
    await PUT(putRequest({ photos: [{ url: URL_B }] }));
    expect(settingStore["gallery_photos"]).toBe(JSON.stringify([URL_A]));
  });
});
