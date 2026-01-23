-- AlterTable
ALTER TABLE "Anime" ADD COLUMN     "format" TEXT,
ADD COLUMN     "seasonYear" INTEGER,
ADD COLUMN     "status" TEXT,
ADD COLUMN     "tags" TEXT[];
