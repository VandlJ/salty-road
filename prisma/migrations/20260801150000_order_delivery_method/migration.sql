-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryMethod" TEXT NOT NULL DEFAULT 'shipping',
ADD COLUMN     "shippingFee" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "address" DROP NOT NULL;
