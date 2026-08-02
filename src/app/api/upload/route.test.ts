import { describe, it, expect, vi, beforeEach } from "vitest";

const putMock = vi.fn().mockResolvedValue({ url: "https://blob.example/test.jpg" });
vi.mock("@vercel/blob", () => ({ put: putMock }));

// Garbage bytes aren't valid HEIC, so both the primary and fallback
// converters legitimately fail to parse them — exercising the same
// "conversion failed, proceed with original buffer" path the real route
// takes for a corrupt upload, without needing a real HEIC fixture file.
vi.mock("sharp", () => ({
  default: () => ({
    rotate: () => ({
      toFormat: () => ({ toBuffer: () => Promise.reject(new Error("bad image data")) }),
    }),
  }),
}));
vi.mock("heic-convert", () => ({
  default: vi.fn().mockRejectedValue(new Error("bad image data")),
}));

let isAdmin = true;
vi.mock("@/lib/adminAuth", () => ({
  getAdminFromReq: vi.fn(() => Promise.resolve(isAdmin ? { username: "admin" } : null)),
}));

vi.mock("@/lib/rateLimit", () => ({
  rateLimit: vi.fn().mockResolvedValue(true),
  getClientIp: () => "127.0.0.1",
}));

const { POST } = await import("./route");

function uploadRequest(file: File | null, folder?: string) {
  const formData = new FormData();
  if (file) formData.set("file", file);
  if (folder) formData.set("folder", folder);
  return new Request("http://localhost/api/upload", { method: "POST", body: formData });
}

beforeEach(() => {
  isAdmin = true;
  putMock.mockClear();
});

describe("POST /api/upload", () => {
  it("rejects a merch upload without an admin session", async () => {
    isAdmin = false;
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    const res = await POST(uploadRequest(file, "merch"));
    expect(res.status).toBe(401);
  });

  it("allows a registrations upload without an admin session", async () => {
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    const res = await POST(uploadRequest(file, "registrations"));
    expect(res.status).toBe(200);
  });

  it("rejects a request with no file", async () => {
    const res = await POST(uploadRequest(null));
    expect(res.status).toBe(400);
  });

  it("rejects a file over the size limit", async () => {
    const big = new File([new Uint8Array(15 * 1024 * 1024 + 1)], "big.jpg", { type: "image/jpeg" });
    const res = await POST(uploadRequest(big));
    expect(res.status).toBe(413);
  });

  it("rejects an unsupported content type with a non-heic filename", async () => {
    const file = new File(["<html></html>"], "evil.html", { type: "text/html" });
    const res = await POST(uploadRequest(file));
    expect(res.status).toBe(415);
  });

  it("never stores the client-supplied Content-Type verbatim when it's outside the allowlist", async () => {
    // Passes the type gate via the .heic filename (not the content-type),
    // then fails HEIC conversion on garbage bytes — the route must fall
    // back to a safe stored type, never the spoofed "text/html" header.
    const file = new File(["not actually heic data"], "evil.heic", { type: "text/html" });
    const res = await POST(uploadRequest(file));
    expect(res.status).toBe(200);
    expect(putMock).toHaveBeenCalledTimes(1);
    const [, , options] = putMock.mock.calls[0];
    expect(options.contentType).not.toBe("text/html");
  });

  it("passes through an allowed content type unchanged", async () => {
    const file = new File(["data"], "photo.png", { type: "image/png" });
    const res = await POST(uploadRequest(file));
    expect(res.status).toBe(200);
    const [, , options] = putMock.mock.calls[0];
    expect(options.contentType).toBe("image/png");
  });

  it("defaults to the registrations folder for an unrecognised folder value", async () => {
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    const res = await POST(uploadRequest(file, "not-a-real-folder"));
    expect(res.status).toBe(200);
    const [remotePath] = putMock.mock.calls[0];
    expect(remotePath.startsWith("registrations/")).toBe(true);
  });
});
