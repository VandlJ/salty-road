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

const PHOTO_A = { url: "https://blob.example.com/gallery/a.jpg", instagram: null };
const PHOTO_B = { url: "https://blob.example.com/gallery/b.jpg", instagram: "@some_photographer" };

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

  it("reads back a legacy plain-string-array value (pre-Instagram-tagging)", async () => {
    settingStore["gallery_photos"] = JSON.stringify([PHOTO_A.url]);
    const res = await GET();
    expect((await res.json()).photos).toEqual([{ url: PHOTO_A.url, instagram: null }]);
  });
});

describe("PUT /api/admin/gallery", () => {
  it("rejects an unauthenticated request", async () => {
    isAdmin = false;
    const res = await PUT(putRequest({ photos: [PHOTO_A] }));
    expect(res.status).toBe(401);
  });

  it("round-trips an ordered list, including the Instagram tag", async () => {
    const res = await PUT(putRequest({ photos: [PHOTO_A, PHOTO_B] }));
    expect(res.status).toBe(200);
    expect((await res.json()).photos).toEqual([PHOTO_A, PHOTO_B]);

    const read = await GET();
    expect((await read.json()).photos).toEqual([PHOTO_A, PHOTO_B]);
  });

  it("normalizes a missing/blank instagram to null", async () => {
    const res = await PUT(putRequest({ photos: [{ url: PHOTO_A.url }, { url: PHOTO_B.url, instagram: "   " }] }));
    expect((await res.json()).photos).toEqual([
      { url: PHOTO_A.url, instagram: null },
      { url: PHOTO_B.url, instagram: null },
    ]);
  });

  it("accepts an empty list (deleting the last photo)", async () => {
    settingStore["gallery_photos"] = JSON.stringify([PHOTO_A]);
    const res = await PUT(putRequest({ photos: [] }));
    expect(res.status).toBe(200);
    expect((await GET().then((r) => r.json())).photos).toEqual([]);
  });

  it("rejects a non-array photos field", async () => {
    const res = await PUT(putRequest({ photos: "nope" }));
    expect(res.status).toBe(400);
  });

  it("rejects an entry with no url", async () => {
    const res = await PUT(putRequest({ photos: [PHOTO_A, { instagram: "@x" }] }));
    expect(res.status).toBe(400);
  });

  it("rejects a non-https URL", async () => {
    // url is rendered straight into <img src> on the homepage.
    const res = await PUT(putRequest({ photos: [{ url: "javascript:alert(1)", instagram: null }] }));
    expect(res.status).toBe(400);
  });

  it("rejects an absurdly long instagram value", async () => {
    const res = await PUT(putRequest({ photos: [{ url: PHOTO_A.url, instagram: "x".repeat(201) }] }));
    expect(res.status).toBe(400);
  });

  it("rejects more photos than the cap allows", async () => {
    const res = await PUT(putRequest({ photos: Array(501).fill(PHOTO_A) }));
    expect(res.status).toBe(400);
  });

  it("leaves the stored value untouched when validation fails", async () => {
    settingStore["gallery_photos"] = JSON.stringify([PHOTO_A]);
    await PUT(putRequest({ photos: [{ instagram: "@x" }] }));
    expect(settingStore["gallery_photos"]).toBe(JSON.stringify([PHOTO_A]));
  });
});
