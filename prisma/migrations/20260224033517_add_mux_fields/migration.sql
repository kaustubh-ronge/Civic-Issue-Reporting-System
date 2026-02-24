-- AlterTable
ALTER TABLE "ReportVideo" ADD COLUMN     "assetId" TEXT,
ADD COLUMN     "playbackId" TEXT,
ALTER COLUMN "url" DROP NOT NULL;
