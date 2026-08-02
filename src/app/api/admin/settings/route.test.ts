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

const { GET, PATCH } = await import("./route");

function patchRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/admin/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  settingStore = {};
  isAdmin = true;
});

describe("GET /api/admin/settings", () => {
  it("rejects an unauthenticated request", async () => {
    isAdmin = false;
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns defaults when nothing has been configured yet", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.registrationOpen).toBe(false);
    expect(json.shopEnabled).toBe(false);
    expect(json.stickerGiftThresholdHalire).toBe(0);
  });
});

describe("PATCH /api/admin/settings", () => {
  it("rejects an unauthenticated request", async () => {
    isAdmin = false;
    const res = await PATCH(patchRequest({ shopEnabled: true }));
    expect(res.status).toBe(401);
  });

  it("rejects a body with no recognised fields", async () => {
    const res = await PATCH(patchRequest({ notARealField: 1 }));
    expect(res.status).toBe(400);
  });

  it("persists stickerGiftThresholdHalire as a rounded integer", async () => {
    const res = await PATCH(patchRequest({ stickerGiftThresholdHalire: 1500.7 }));
    expect(res.status).toBe(200);
    expect((await res.json()).stickerGiftThresholdHalire).toBe(1501);
    expect(settingStore["sticker_gift_threshold_halire"]).toBe("1501");
  });

  it("clamps a negative halire value to 0", async () => {
    const res = await PATCH(patchRequest({ shippingFeeHalire: -500 }));
    expect(res.status).toBe(200);
    expect((await res.json()).shippingFeeHalire).toBe(0);
    expect(settingStore["shipping_fee_halire"]).toBe("0");
  });

  it("ignores a non-numeric value for a halire field", async () => {
    const res = await PATCH(patchRequest({ shippingFeeHalire: "9900" }));
    // No recognised field ended up being applied (the string is rejected by
    // the typeof check), so this falls through to the "nothing changed" 400.
    expect(res.status).toBe(400);
  });

  it("persists boolean toggles independently", async () => {
    const res = await PATCH(patchRequest({ shopEnabled: true, registrationOpen: false }));
    const json = await res.json();
    expect(json.shopEnabled).toBe(true);
    expect(json.registrationOpen).toBe(false);
    expect(settingStore["shop_enabled"]).toBe("true");
  });
});
