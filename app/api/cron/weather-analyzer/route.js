import { db } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { analyzeWeatherAndRisk } from "@/lib/environmentalIntelligence";

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const authHeader = request.headers.get('authorization');
        const vercelCronHeader = request.headers.get("x-vercel-cron");
        const isTrustedVercelCron = vercelCronHeader === "1";
        const hasValidBearer = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;

        if (process.env.CRON_SECRET && !hasValidBearer && !isTrustedVercelCron) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const intervalDaysAgo = new Date();
        intervalDaysAgo.setDate(intervalDaysAgo.getDate() - 4);

        const whereClause = {
            status: { not: "REJECTED" },
            OR: [
                { lastWeatherScan: null },
                { lastWeatherScan: { lt: intervalDaysAgo } }
            ]
        };

        const totalCandidates = await db.report.count({ where: whereClause });
        if (totalCandidates === 0) {
            return NextResponse.json({
                success: true,
                message: "No reports require environmental scanning at this time."
            });
        }

        let processedCount = 0;
        const errors = [];
        const batchSize = 25;
        let cursorId = null;

        while (true) {
            const reportsToScan = await db.report.findMany({
                where: whereClause,
                orderBy: { id: "asc" },
                take: batchSize,
                ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {})
            });

            if (reportsToScan.length === 0) break;
            cursorId = reportsToScan[reportsToScan.length - 1].id;

            for (const report of reportsToScan) {
                const result = await analyzeWeatherAndRisk(report.id);
                if (result.success) processedCount++;
                else errors.push({ reportId: report.id, error: result.error });
            }
        }

        return NextResponse.json({
            success: true,
            totalCandidates,
            scannedCount: processedCount,
            errors: errors.length > 0 ? errors : null,
            message: `Batch Scan Complete. Processed ${processedCount} reports from ${totalCandidates} eligible records.`
        });

    } catch (error) {
        console.error("Cron System Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}