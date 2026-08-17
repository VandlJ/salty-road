import { NextResponse } from "next/server";
import { z } from "zod";
import { withAdmin } from "@/lib/apiHandler";
import { requireCurrentEdition } from "@/lib/edition";
import { getHeroVideo, setHeroVideo } from "@/lib/heroVideoStore";
import type { HeroVideo } from "@/lib/heroVideo";

// The clip itself is encoded and uploaded by the admin's browser (see
// admin/hero/_lib/encode.ts); this route only records which URLs the hero
// should point at.

const MAX_URL = 500;

// Blob URLs only. Every value here ends up in a <source src> / <img src> on
// the public homepage, so a javascript: or data: entry would be a stored XSS
// vector with an admin session as the only gate.
const blobUrl = z
  .string()
  .max(MAX_URL)
  .url()
  .refine((u) => {
    try {
      const { protocol, hostname } = new URL(u);
      return protocol === "https:" && hostname.endsWith(".public.blob.vercel-storage.com");
    } catch {
      return false;
    }
  }, "must be a public Blob URL");

const heroVideoSchema = z.object({
  poster: blobUrl,
  sources: z
    .array(
      z.object({
        url: blobUrl,
        // Constrained rather than free text: it is rendered into a `type`
        // attribute, and only these two families are ever produced.
        type: z.string().max(60).regex(/^video\/mp4; codecs="[\w.]+"$/),
        media: z.string().max(60).regex(/^\(min-width: \d{3,4}px\)$/).optional(),
        width: z.number().int().min(16).max(4096),
        height: z.number().int().min(16).max(4096),
        bytes: z.number().int().min(1).max(50_000_000),
      })
    )
    .min(1)
    .max(6),
  start: z.number().min(0).max(86_400),
  end: z.number().min(0).max(86_400),
  sourceName: z.string().max(255),
  sourceBytes: z.number().int().min(0),
});

export const GET = withAdmin("GET /api/admin/hero", async () => {
  const edition = await requireCurrentEdition();
  return NextResponse.json({
    heroVideo: await getHeroVideo(edition.id),
    editionName: edition.name,
  });
});

export const PUT = withAdmin("PUT /api/admin/hero", async ({ req }) => {
  const body = await req.json().catch(() => null);

  // An explicit null clears the clip and returns the hero to the files
  // committed under /public/hero — the way back out if a chosen loop turns
  // out to look wrong on the live site.
  if (body?.heroVideo === null) {
    const edition = await requireCurrentEdition();
    await setHeroVideo(edition.id, null);
    return NextResponse.json({ heroVideo: null });
  }

  const parsed = heroVideoSchema.safeParse(body?.heroVideo);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_hero_video" }, { status: 400 });
  }
  if (parsed.data.end <= parsed.data.start) {
    return NextResponse.json({ error: "invalid_range" }, { status: 400 });
  }

  const edition = await requireCurrentEdition();
  const heroVideo: HeroVideo = { ...parsed.data, updatedAt: new Date().toISOString() };
  await setHeroVideo(edition.id, heroVideo);

  return NextResponse.json({ heroVideo });
});
