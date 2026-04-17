/*
  Warnings:

  - You are about to drop the `_ReportToTag` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ReportToTag" DROP CONSTRAINT "_ReportToTag_A_fkey";

-- DropForeignKey
ALTER TABLE "_ReportToTag" DROP CONSTRAINT "_ReportToTag_B_fkey";

-- DropTable
DROP TABLE "_ReportToTag";
