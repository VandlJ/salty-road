import { execSync } from "child_process";

// Production's DATABASE_URL goes through Prisma Accelerate
// (prisma+postgres://accelerate.prisma-data.net/...), which a --no-engine
// client (no bundled query engine binary, smaller build) can talk to fine —
// Accelerate is a remote proxy, the local engine is never used regardless.
//
// Preview/Development deployments point at a separate dev database instead
// (see prisma-salty-road-dev), connected as a plain pooled Postgres URL
// (postgres://...@pooled.db.prisma.io/...), not through Accelerate. A
// --no-engine client has no way to speak raw Postgres wire protocol, so it
// would fail outright there. Only production gets the lean build.
const noEngine = process.env.VERCEL_ENV === "production";

console.log(`prisma generate (VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"}, --no-engine=${noEngine})`);
execSync(`npx prisma generate${noEngine ? " --no-engine" : ""}`, { stdio: "inherit" });
