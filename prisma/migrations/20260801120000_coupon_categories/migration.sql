-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN     "categories" TEXT[] DEFAULT ARRAY[]::TEXT[];
