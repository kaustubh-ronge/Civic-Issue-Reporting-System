/*
  Warnings:

  - You are about to drop the `_ReportToTag` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ReportToTag" DROP CONSTRAINT "_ReportToTag_A_fkey";

-- DropForeignKey
ALTER TABLE "_ReportToTag" DROP CONSTRAINT "_ReportToTag_B_fkey";

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "aiRiskAnalysis" TEXT,
ADD COLUMN     "lastWeatherScan" TIMESTAMP(3),
ADD COLUMN     "pdfReportBase64" TEXT,
ADD COLUMN     "weatherForecast" TEXT;

-- DropTable
DROP TABLE "_ReportToTag";
