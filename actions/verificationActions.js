'use server'

import { db } from "@/lib/prisma"
import { checkUser } from "@/lib/checkUser"
import { revalidatePath } from "next/cache"

export async function verifyReport(reportId) {
    try {
        const user = await checkUser()
        if (!user) return { success: false, error: "You must be logged in." }

        // 1. Find the report to get internal ID and current status
        const report = await db.report.findFirst({
            where: { OR: [{ id: reportId }, { reportId: reportId }] },
            select: { id: true, reportId: true, authorId: true, isVerified: true }
        })

        if (!report) return { success: false, error: "Report not found" }

        // 2. Transaction to ensure data integrity
        const result = await db.$transaction(async (tx) => {
            // Check for existing verification
            const existing = await tx.verification.findUnique({
                where: {
                    reportId_verifierId: { reportId: report.id, verifierId: user.id }
                }
            })

            if (existing) {
                throw new Error("You have already verified this report")
            }

            // Create verification record
            await tx.verification.create({
                data: {
                    reportId: report.id,
                    verifierId: user.id,
                    isVerified: true
                }
            })

            // Award points to the verifier
            await tx.user.update({
                where: { id: user.id },
                data: { reputationPoints: { increment: 1 } }
            })

            // Calculate new verification count
            const verificationCount = await tx.verification.count({
                where: { reportId: report.id, isVerified: true }
            })

            // Threshold Logic: If >= 3 AND not yet verified, update status and reward author
            if (verificationCount >= 3 && !report.isVerified) {
                await tx.report.update({
                    where: { id: report.id },
                    data: { verificationCount, isVerified: true }
                })

                await tx.user.update({
                    where: { id: report.authorId },
                    data: {
                        verifiedReports: { increment: 1 },
                        reputationPoints: { increment: 5 }
                    }
                })
            } else {
                // Otherwise just update the count
                await tx.report.update({
                    where: { id: report.id },
                    data: { verificationCount }
                })
            }

            return { success: true, reportId: report.reportId }
        })

        revalidatePath(`/report/${result.reportId}`)
        return { success: true }

    } catch (error) {
        console.error("Verification Error:", error)
        // Return a clean error message to the client
        return { 
            success: false, 
            error: error.message === "You have already verified this report" 
                ? error.message 
                : "Failed to verify report. Please try again." 
        }
    }
}