-- AlterTable
ALTER TABLE "Registration" ADD COLUMN     "arrived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "arrivedAt" TIMESTAMP(3);
