/*
  Warnings:

  - Changed the type of `status` on the `Order` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('AWAITING_MEASUREMENT', 'AWAITING_PAYMENT', 'PENDING_CONFIRMATION', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "measuredPrice" DOUBLE PRECISION,
DROP COLUMN "status",
ADD COLUMN     "status" "OrderStatus" NOT NULL;
