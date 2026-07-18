import prisma from "@/lib/prisma";

const REGISTRATION_OPEN_KEY = "registration_open";

export async function getRegistrationOpen(): Promise<boolean> {
  const setting = await prisma.setting.findUnique({
    where: { key: REGISTRATION_OPEN_KEY },
  });
  return setting?.value === "true";
}

export async function setRegistrationOpen(open: boolean): Promise<void> {
  await prisma.setting.upsert({
    where: { key: REGISTRATION_OPEN_KEY },
    update: { value: open ? "true" : "false" },
    create: { key: REGISTRATION_OPEN_KEY, value: open ? "true" : "false" },
  });
}
