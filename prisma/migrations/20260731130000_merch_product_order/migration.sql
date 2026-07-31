-- AlterTable: explicit admin-controlled display order for products
ALTER TABLE "MerchProduct" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- Backfill using the current createdAt-ascending order (what the public
-- shop grid was sorted by before this column existed), so nothing visually
-- reshuffles until an admin explicitly reorders something.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC) - 1 AS rn
  FROM "MerchProduct"
)
UPDATE "MerchProduct" p SET "order" = ranked.rn
FROM ranked WHERE p.id = ranked.id;
