import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (!process.argv.includes("--confirm")) {
    console.error("This deletes ALL registrations permanently.");
    console.error("Re-run with --confirm to proceed: node scripts/clearRegistrations.mjs --confirm");
    process.exit(1);
  }

  const { count } = await prisma.registration.deleteMany({});
  console.log(`Deleted ${count} registration(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
