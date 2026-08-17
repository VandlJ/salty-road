import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { parseHeroVideo, type HeroVideo } from "@/lib/heroVideo";

// Split from lib/heroVideo.ts, which is otherwise pure: importing the advisor
// rules must not drag a PrismaClient into a unit test. That exact chain broke
// `npm test` once already (see the note in lib/prisma.ts).

// No cache tag to invalidate: the homepage reads the edition through
// requireCurrentEdition() on every request (no unstable_cache, no Accelerate
// cacheStrategy), so a save is live on the next page load.

export async function getHeroVideo(editionId: string): Promise<HeroVideo | null> {
  const edition = await prisma.edition.findUnique({
    where: { id: editionId },
    select: { heroVideo: true },
  });
  return parseHeroVideo(edition?.heroVideo);
}

export async function setHeroVideo(editionId: string, value: HeroVideo | null) {
  await prisma.edition.update({
    where: { id: editionId },
    // Prisma.DbNull, not a plain null and not `{ set: null }`. On a Json?
    // field Prisma has no way to tell "store the JSON value null" from "make
    // the column NULL", so it refuses both shorthands — `{ set: null }` is
    // taken literally and lands in the column as the object {"set": null},
    // which then fails the homepage's null check and renders a video element
    // with no sources.
    data: { heroVideo: value === null ? Prisma.DbNull : value },
  });
}
