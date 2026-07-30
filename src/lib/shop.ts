import prisma from "@/lib/prisma";

const SHOP_ENABLED_KEY = "shop_enabled";

export async function getShopEnabled(): Promise<boolean> {
  const setting = await prisma.setting.findUnique({
    where: { key: SHOP_ENABLED_KEY },
  });
  return setting?.value === "true";
}

export async function setShopEnabled(enabled: boolean): Promise<void> {
  await prisma.setting.upsert({
    where: { key: SHOP_ENABLED_KEY },
    update: { value: enabled ? "true" : "false" },
    create: { key: SHOP_ENABLED_KEY, value: enabled ? "true" : "false" },
  });
}
