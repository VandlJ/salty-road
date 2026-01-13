/*
  Warnings:

  - You are about to drop the column `car` on the `Registration` table. All the data in the column will be lost.
  - You are about to drop the column `mobile` on the `Registration` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Registration` table. All the data in the column will be lost.
  - You are about to drop the column `plate` on the `Registration` table. All the data in the column will be lost.
  - Added the required column `brand` to the `Registration` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstName` to the `Registration` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `Registration` table without a default value. This is not possible if the table is not empty.
  - Added the required column `model` to the `Registration` table without a default value. This is not possible if the table is not empty.
  - Added the required column `year` to the `Registration` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Registration" DROP COLUMN "car",
DROP COLUMN "mobile",
DROP COLUMN "name",
DROP COLUMN "plate",
ADD COLUMN     "brand" TEXT NOT NULL,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "model" TEXT NOT NULL,
ADD COLUMN     "year" TEXT NOT NULL;
