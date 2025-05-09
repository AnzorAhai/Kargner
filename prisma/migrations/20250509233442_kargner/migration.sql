/*
  Warnings:

  - Added the required column `clientName` to the `Announcement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientPhone` to the `Announcement` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'ADMIN';

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "clientName" TEXT NOT NULL,
ADD COLUMN     "clientPhone" TEXT NOT NULL;
