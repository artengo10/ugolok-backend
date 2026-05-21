-- CreateEnum
CREATE TYPE "OtpType" AS ENUM ('REGISTER', 'RESET');

-- AlterTable
ALTER TABLE "OtpCode" ADD COLUMN     "type" "OtpType" NOT NULL DEFAULT 'REGISTER';
