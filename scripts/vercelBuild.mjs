import { execSync } from "child_process";

// Vercel build entry point (package.json "vercel-build"), doing two things
// `next build` won't do on its own: generate the right Prisma client for the
// target environment, then apply pending migrations.

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
const isProduction = process.env.VERCEL_ENV === "production";

console.log(
  `prisma generate (VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"}, --no-engine=${isProduction})`
);
execSync(`npx prisma generate${isProduction ? " --no-engine" : ""}`, { stdio: "inherit" });

// Migrations run against directUrl (DIRECT_DATABASE_URL in schema.prisma) —
// migrate deploy needs a real Postgres connection and cannot go through the
// Accelerate proxy that DATABASE_URL points at in production.
//
// This step used to be missing entirely: the deploy shipped code that assumed
// a new column while nothing in the repo ever applied the migration, so a
// schema change reached production only if someone remembered to run it by
// hand. Failing the build here is deliberate — a deploy against an
// un-migrated database is the worse outcome. migrate deploy is idempotent,
// so re-running it against an already-current database is a no-op.
if (!process.env.DIRECT_DATABASE_URL) {
  console.error(
    "DIRECT_DATABASE_URL is not set — prisma migrate deploy cannot run.\n" +
      "Set it in the Vercel project's environment variables (it must be a direct\n" +
      "postgres:// connection, not the Accelerate prisma+postgres:// URL)."
  );
  process.exit(1);
}

console.log("prisma migrate deploy");
execSync("npx prisma migrate deploy", { stdio: "inherit" });

console.log("next build");
execSync("npx next build --turbopack", { stdio: "inherit" });
