-- AlterTable: add the new structured columns first (nullable, so existing
-- rows aren't broken mid-migration), backfill them from the old free-text
-- "label" column, then drop "label" once nothing depends on it anymore.
ALTER TABLE "MerchVariant" ADD COLUMN     "color" TEXT,
ADD COLUMN     "size" TEXT;

-- Backfill: every existing row's label is either "SIZE / Color" or just
-- "Color" (no size dimension, e.g. the trucker cap). Hand-written per SKU
-- since the current catalog is small (3 products, 17 variants) — cheaper
-- and safer than a generic regex parse for a one-time backfill.
UPDATE "MerchVariant" SET "size" = 'S',   "color" = 'Černá' WHERE "sku" = 'hoodie-classic-black-s';
UPDATE "MerchVariant" SET "size" = 'M',   "color" = 'Černá' WHERE "sku" = 'hoodie-classic-black-m';
UPDATE "MerchVariant" SET "size" = 'L',   "color" = 'Černá' WHERE "sku" = 'hoodie-classic-black-l';
UPDATE "MerchVariant" SET "size" = 'XL',  "color" = 'Černá' WHERE "sku" = 'hoodie-classic-black-XL';
UPDATE "MerchVariant" SET "size" = '2XL', "color" = 'Černá' WHERE "sku" = 'hoodie-classic-black-2xl';

UPDATE "MerchVariant" SET "color" = 'Černá' WHERE "sku" = 'hat-trucker-black';
UPDATE "MerchVariant" SET "color" = 'Bílá'  WHERE "sku" = 'hat-trucker-white';

UPDATE "MerchVariant" SET "size" = 'S',   "color" = 'Černá' WHERE "sku" = 'tee-oversize-srm1-s';
UPDATE "MerchVariant" SET "size" = 'M',   "color" = 'Černá' WHERE "sku" = 'tee-oversize-srm1-m';
UPDATE "MerchVariant" SET "size" = 'L',   "color" = 'Černá' WHERE "sku" = 'tee-oversize-srm1-l';
UPDATE "MerchVariant" SET "size" = 'XL',  "color" = 'Černá' WHERE "sku" = 'tee-oversize-srm1-xl';
UPDATE "MerchVariant" SET "size" = '2XL', "color" = 'Černá' WHERE "sku" = 'tee-oversize-srm1-2xl';
UPDATE "MerchVariant" SET "size" = 'S',   "color" = 'Bílá' WHERE "sku" = 'tee-oversize-srm1-white-s';
UPDATE "MerchVariant" SET "size" = 'M',   "color" = 'Bílá' WHERE "sku" = 'tee-oversize-srm1-white-M';
UPDATE "MerchVariant" SET "size" = 'L',   "color" = 'Bílá' WHERE "sku" = 'tee-oversize-srm1-white-l';
UPDATE "MerchVariant" SET "size" = 'XL',  "color" = 'Bílá' WHERE "sku" = 'tee-oversize-srm1-white-xl';
UPDATE "MerchVariant" SET "size" = '2XL', "color" = 'Bílá' WHERE "sku" = 'tee-oversize-srm1-white-2xl';

-- Fallback for any row this hand-written backfill missed (future SKUs added
-- between writing this migration and deploying it) — best-effort parse of
-- "SIZE / Color" / "Color"-only, so nothing is silently left NULL.
UPDATE "MerchVariant"
SET "size" = trim(split_part("label", '/', 1)),
    "color" = trim(split_part("label", '/', 2))
WHERE "color" IS NULL AND "label" LIKE '%/%';

UPDATE "MerchVariant"
SET "color" = trim("label")
WHERE "color" IS NULL AND "label" NOT LIKE '%/%';

ALTER TABLE "MerchVariant" DROP COLUMN "label";
