-- CreateIndex
CREATE INDEX "Admin_sessionToken_idx" ON "Admin"("sessionToken");

-- CreateIndex
CREATE INDEX "Registration_status_order_idx" ON "Registration"("status", "order");
