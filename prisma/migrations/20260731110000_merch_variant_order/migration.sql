-- AlterTable: explicit admin-controlled display order for variants
ALTER TABLE "MerchVariant" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- Backfill using the current alphabetical-by-label order (what variants
-- were sorted by before this column existed), so nothing visually
-- reshuffles until an admin explicitly reorders something.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "productId" ORDER BY label ASC) - 1 AS rn
  FROM "MerchVariant"
)
UPDATE "MerchVariant" v SET "order" = ranked.rn
FROM ranked WHERE v.id = ranked.id;
