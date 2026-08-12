import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Deletes registrations. Originally this wiped the whole table, because it
// was the only way to "start a new season" — there was no notion of an
// edition, so last year's exhibitors had to be destroyed to make room.
//
// That is no longer how a new edition starts: create an Edition row, and the
// previous one keeps its registrations on its archive page. So this now
// requires an explicit --edition=<slug> and refuses to touch anything else.
async function main() {
  const slugArg = process.argv.find((a) => a.startsWith("--edition="));
  const slug = slugArg?.split("=")[1];

  if (!slug) {
    console.error("Usage: node scripts/clearRegistrations.mjs --edition=<slug> --confirm");
    console.error("");
    console.error("Deletes the registrations of ONE edition, permanently.");
    console.error("Starting a new edition does not require this — add an Edition row instead;");
    console.error("previous editions keep their registrations for their archive page.");
    const editions = await prisma.edition.findMany({
      orderBy: { number: "asc" },
      select: { slug: true, name: true, status: true, _count: { select: { registrations: true } } },
    });
    if (editions.length) {
      console.error("");
      console.error("Editions:");
      for (const e of editions) {
        console.error(`  ${e.slug.padEnd(10)} ${e.name} (${e.status}) — ${e._count.registrations} registration(s)`);
      }
    }
    process.exit(1);
  }

  const edition = await prisma.edition.findUnique({ where: { slug } });
  if (!edition) {
    console.error(`No edition with slug "${slug}".`);
    process.exit(1);
  }

  const count = await prisma.registration.count({ where: { editionId: edition.id } });

  if (!process.argv.includes("--confirm")) {
    console.error(`This permanently deletes ${count} registration(s) from "${edition.name}".`);
    console.error(`Re-run with --confirm to proceed.`);
    process.exit(1);
  }

  const { count: deleted } = await prisma.registration.deleteMany({
    where: { editionId: edition.id },
  });
  console.log(`Deleted ${deleted} registration(s) from "${edition.name}".`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
