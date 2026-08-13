-- Drops three columns added one migration earlier and never read.
--
-- The intent was to make every piece of per-edition content database-driven.
-- That turned out to be right for the gallery (it has an admin UI, and its
-- images are Blob uploads) and wrong for these three:
--
--   sponsors  — the 26 logos are static files in public/sponsors, so adding a
--               sponsor requires a commit regardless. Storing the metadata in
--               the database while the image needs a deploy splits one change
--               across two systems, and there is no admin UI to edit it, so it
--               would have been strictly harder to change than the TS file it
--               replaced. Per-logo `scaleClass` is presentational tuning too.
--   videos    — same missing-UI problem, for two YouTube ids.
--   recapStats — the labels are translated, which a single JSON column can't
--               express as cleanly as messages/*.json already does.
--
-- All three now live in src/content/editions.ts, keyed by edition slug.
-- Dropping them rather than leaving them unused: an empty column nothing
-- reads is exactly the kind of residue this refactor exists to remove.
--
-- Safe to drop: written by no code path, and every row still holds the '[]'
-- default they were created with.
ALTER TABLE "Edition" DROP COLUMN "videos";
ALTER TABLE "Edition" DROP COLUMN "sponsors";
ALTER TABLE "Edition" DROP COLUMN "recapStats";
