-- AlterTable
ALTER TABLE "MerchProduct" ADD COLUMN     "giftOnly" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "giftLabel" TEXT,
ADD COLUMN     "giftProductId" TEXT,
ADD COLUMN     "giftVariantSku" TEXT;
