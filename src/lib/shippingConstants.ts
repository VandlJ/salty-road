// Split out from shipping.ts on purpose — that file imports prisma at
// module scope, so any client component importing from it (even just for
// this constant) drags PrismaClient into the browser bundle and crashes
// ("PrismaClient is unable to run in this browser environment").
// 99 Kč — used whenever the admin hasn't set a custom fee yet.
export const DEFAULT_SHIPPING_FEE = 9900;
