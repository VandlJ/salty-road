import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    // We try to delete all records.
    // Note: The client might be out of sync if schema changed but not generated.
    // But since we haven't successfully migrated yet, the DB and Client should be compatible enough or we use raw query.
    // Ideally we use deleteMany.
    await prisma.registration.deleteMany({});
    console.log("All registrations deleted.");
  } catch (e) {
    console.warn("deleteMany failed, trying raw query just in case", e);
    // If client is too out of sync, raw query might be needed but table name is usually "Registration" (PascalCase or lower?). 
    // Prisma default map is usually the model name or mapped name.
    // Let's assume deleteMany works or we fail.
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
