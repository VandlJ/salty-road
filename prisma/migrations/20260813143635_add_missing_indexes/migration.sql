-- AlterTable
ALTER TABLE "Edition" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MerchProduct" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Registration" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Coupon_createdAt_idx" ON "Coupon"("createdAt");

-- CreateIndex
CREATE INDEX "MerchProduct_active_sellable_order_idx" ON "MerchProduct"("active", "sellable", "order");

-- CreateIndex
CREATE INDEX "MerchProduct_active_giftEligible_order_idx" ON "MerchProduct"("active", "giftEligible", "order");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "StockRequest_sku_fulfilled_idx" ON "StockRequest"("sku", "fulfilled");
