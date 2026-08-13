import { describe, it, expect, vi, beforeEach } from "vitest";

const findFirst = vi.fn();
const findUnique = vi.fn();
const findMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  default: { edition: { findFirst, findUnique, findMany } },
}));

const { getCurrentEdition, getEditionBySlug, getArchivedEditions, requireCurrentEdition } =
  await import("@/lib/edition");

const vol1 = { id: "e1", slug: "vol1", number: 1, status: "archived" };
const vol2 = { id: "e2", slug: "vol2", number: 2, status: "upcoming" };

beforeEach(() => {
  findFirst.mockReset();
  findUnique.mockReset();
  findMany.mockReset();
});

describe("getCurrentEdition", () => {
  it("prefers an upcoming/live edition over an archived one", async () => {
    findFirst.mockResolvedValueOnce(vol2);

    expect(await getCurrentEdition()).toBe(vol2);
    expect(findFirst).toHaveBeenCalledTimes(1);
    expect(findFirst.mock.calls[0][0].where).toEqual({ status: { in: ["upcoming", "live"] } });
  });

  it("falls back to the newest archived edition between events", async () => {
    // The state the site sits in after an event and before the next edition
    // row exists — without the fallback the homepage would have no edition.
    findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(vol1);

    expect(await getCurrentEdition()).toBe(vol1);
    expect(findFirst).toHaveBeenCalledTimes(2);
    expect(findFirst.mock.calls[1][0].where).toEqual({ status: "archived" });
    expect(findFirst.mock.calls[1][0].orderBy).toEqual({ number: "desc" });
  });

  it("returns null when no edition exists at all", async () => {
    findFirst.mockResolvedValue(null);
    expect(await getCurrentEdition()).toBeNull();
  });
});

describe("requireCurrentEdition", () => {
  it("returns the edition when one exists", async () => {
    findFirst.mockResolvedValueOnce(vol2);
    expect(await requireCurrentEdition()).toBe(vol2);
  });

  it("throws rather than letting callers see an empty list", async () => {
    // A silent null would render as "no registrations yet" instead of
    // surfacing that the database has no edition configured.
    findFirst.mockResolvedValue(null);
    await expect(requireCurrentEdition()).rejects.toThrow("NO_EDITION");
  });
});

describe("getEditionBySlug", () => {
  it("looks up by the unique slug", async () => {
    findUnique.mockResolvedValueOnce(vol1);
    expect(await getEditionBySlug("vol1")).toBe(vol1);
    expect(findUnique).toHaveBeenCalledWith({ where: { slug: "vol1" } });
  });

  it("returns null for an unknown slug", async () => {
    findUnique.mockResolvedValueOnce(null);
    expect(await getEditionBySlug("nope")).toBeNull();
  });
});

describe("getArchivedEditions", () => {
  it("returns archived editions newest first", async () => {
    findMany.mockResolvedValueOnce([vol1]);
    expect(await getArchivedEditions()).toEqual([vol1]);
    expect(findMany).toHaveBeenCalledWith({
      where: { status: "archived" },
      orderBy: { number: "desc" },
    });
  });
});
