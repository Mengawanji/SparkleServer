/*
  Warnings:

  - The values [NO_SHOW] on the enum `BookingStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `actualHours` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `addressId` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `cancellationReason` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `cancelledAt` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `cleanerId` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `completedAt` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `confirmedAt` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `discountAmount` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `endTime` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `estimatedHours` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `frequency` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `isRecurring` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `recurringBookingId` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `reference` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `serviceId` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `specialInstructions` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `subtotal` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `taxAmount` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `taxRate` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `timeSlot` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the `Address` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Admin` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Availability` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Cleaner` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Customer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Notification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Payment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Review` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Service` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SystemSetting` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `address` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bathroomPrice` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bedroomPrice` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cleaningType` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fullName` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `numberOfBathrooms` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `numberOfBedrooms` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `preferredDate` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `preferredTime` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalPrice` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CleaningType" AS ENUM ('REGULAR', 'DEEP', 'MOVE_OUT_MOVE_IN');

-- AlterEnum
BEGIN;
CREATE TYPE "BookingStatus_new" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');
ALTER TABLE "public"."Booking" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Booking" ALTER COLUMN "status" TYPE "BookingStatus_new" USING ("status"::text::"BookingStatus_new");
ALTER TYPE "BookingStatus" RENAME TO "BookingStatus_old";
ALTER TYPE "BookingStatus_new" RENAME TO "BookingStatus";
DROP TYPE "public"."BookingStatus_old";
ALTER TABLE "Booking" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- DropForeignKey
ALTER TABLE "Address" DROP CONSTRAINT "Address_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Admin" DROP CONSTRAINT "Admin_userId_fkey";

-- DropForeignKey
ALTER TABLE "Availability" DROP CONSTRAINT "Availability_cleanerId_fkey";

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_addressId_fkey";

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_cleanerId_fkey";

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_serviceId_fkey";

-- DropForeignKey
ALTER TABLE "Cleaner" DROP CONSTRAINT "Cleaner_userId_fkey";

-- DropForeignKey
ALTER TABLE "Customer" DROP CONSTRAINT "Customer_userId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_cleanerId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_customerId_fkey";

-- DropIndex
DROP INDEX "Booking_cleanerId_idx";

-- DropIndex
DROP INDEX "Booking_customerId_idx";

-- DropIndex
DROP INDEX "Booking_date_idx";

-- DropIndex
DROP INDEX "Booking_recurringBookingId_idx";

-- DropIndex
DROP INDEX "Booking_reference_idx";

-- DropIndex
DROP INDEX "Booking_reference_key";

-- DropIndex
DROP INDEX "Booking_serviceId_idx";

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "actualHours",
DROP COLUMN "addressId",
DROP COLUMN "cancellationReason",
DROP COLUMN "cancelledAt",
DROP COLUMN "cleanerId",
DROP COLUMN "completedAt",
DROP COLUMN "confirmedAt",
DROP COLUMN "customerId",
DROP COLUMN "date",
DROP COLUMN "discountAmount",
DROP COLUMN "endTime",
DROP COLUMN "estimatedHours",
DROP COLUMN "frequency",
DROP COLUMN "isRecurring",
DROP COLUMN "recurringBookingId",
DROP COLUMN "reference",
DROP COLUMN "serviceId",
DROP COLUMN "specialInstructions",
DROP COLUMN "startTime",
DROP COLUMN "subtotal",
DROP COLUMN "taxAmount",
DROP COLUMN "taxRate",
DROP COLUMN "timeSlot",
DROP COLUMN "totalAmount",
ADD COLUMN     "address" TEXT NOT NULL,
ADD COLUMN     "bathroomPrice" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "bedroomPrice" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "cleaningType" "CleaningType" NOT NULL,
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "fullName" TEXT NOT NULL,
ADD COLUMN     "invoiceSent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "invoiceSentAt" TIMESTAMP(3),
ADD COLUMN     "numberOfBathrooms" INTEGER NOT NULL,
ADD COLUMN     "numberOfBedrooms" INTEGER NOT NULL,
ADD COLUMN     "preferredDate" DATE NOT NULL,
ADD COLUMN     "preferredTime" TEXT NOT NULL,
ADD COLUMN     "totalPrice" DECIMAL(10,2) NOT NULL;

-- DropTable
DROP TABLE "Address";

-- DropTable
DROP TABLE "Admin";

-- DropTable
DROP TABLE "Availability";

-- DropTable
DROP TABLE "Cleaner";

-- DropTable
DROP TABLE "Customer";

-- DropTable
DROP TABLE "Notification";

-- DropTable
DROP TABLE "Payment";

-- DropTable
DROP TABLE "Review";

-- DropTable
DROP TABLE "Service";

-- DropTable
DROP TABLE "SystemSetting";

-- DropTable
DROP TABLE "User";

-- DropEnum
DROP TYPE "PaymentMethod";

-- DropEnum
DROP TYPE "PaymentStatus";

-- DropEnum
DROP TYPE "ServiceFrequency";

-- DropEnum
DROP TYPE "TimeSlot";

-- DropEnum
DROP TYPE "UserRole";

-- CreateIndex
CREATE INDEX "Booking_email_idx" ON "Booking"("email");

-- CreateIndex
CREATE INDEX "Booking_preferredDate_idx" ON "Booking"("preferredDate");
