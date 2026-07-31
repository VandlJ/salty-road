-- AlterTable: product-level photo mode + shared photo gallery + size chart
ALTER TABLE "MerchProduct" ADD COLUMN     "photoMode" TEXT NOT NULL DEFAULT 'shared',
ADD COLUMN     "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "sizeChartImage" TEXT;

-- AlterTable: variant-level photo gallery, backfilled from the old single
-- `image` column before it's dropped, so existing product photos survive.
ALTER TABLE "MerchVariant" ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE "MerchVariant" SET "images" = ARRAY["image"] WHERE "image" IS NOT NULL;

ALTER TABLE "MerchVariant" DROP COLUMN "image";
