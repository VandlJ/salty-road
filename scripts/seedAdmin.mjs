import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const plain = process.env.ADMIN_PASSWORD;

  if (!plain) {
    console.error("ADMIN_PASSWORD env var is required (no default password allowed).");
    console.error("Usage: ADMIN_PASSWORD=your-secret npm run seed:admin");
    process.exit(1);
  }
  if (plain.length < 8) {
    console.error("ADMIN_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }

  const hash = await bcrypt.hash(plain, 10);

  await prisma.admin.upsert({
    where: { username },
    update: { password: hash },
    create: { username, password: hash },
  });

  console.log(`Admin user created/updated: ${username}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
