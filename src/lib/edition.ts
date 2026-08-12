import prisma from "@/lib/prisma";
import type { Edition } from "@prisma/client";

// Every query that reads registrations must be scoped to an edition —
// without it, the first accepted Volume 2 car would appear in Volume 1's
// archive gallery (see /api/vehicles), and the entry check-in board would
// list both years' exhibitors together.

/**
 * The edition the site is currently "about" — the one being registered for
 * or running right now. Falls back to the most recent archived edition once
 * an event is over and the next one hasn't been created yet, which is the
 * state the site sits in between years.
 */
export async function getCurrentEdition(): Promise<Edition | null> {
  const upcoming = await prisma.edition.findFirst({
    where: { status: { in: ["upcoming", "live"] } },
    orderBy: { number: "desc" },
  });
  if (upcoming) return upcoming;

  return prisma.edition.findFirst({
    where: { status: "archived" },
    orderBy: { number: "desc" },
  });
}

export async function getEditionBySlug(slug: string): Promise<Edition | null> {
  return prisma.edition.findUnique({ where: { slug } });
}

/** Past editions, newest first — drives the archive routes and their index. */
export async function getArchivedEditions(): Promise<Edition[]> {
  return prisma.edition.findMany({
    where: { status: "archived" },
    orderBy: { number: "desc" },
  });
}

/**
 * Resolves the edition a public/admin request is about. Throws rather than
 * returning null: with no edition row nothing on the site can render
 * meaningfully, and a silent empty list would look like "no registrations
 * yet" instead of a misconfigured database.
 */
export async function requireCurrentEdition(): Promise<Edition> {
  const edition = await getCurrentEdition();
  if (!edition) throw new Error("NO_EDITION");
  return edition;
}
