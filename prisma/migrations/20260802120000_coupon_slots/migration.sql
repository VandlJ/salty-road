-- AlterTable
ALTER TABLE "Order" DROP COLUMN "couponFreeShipping",
ADD COLUMN     "shippingCouponCode" TEXT;
