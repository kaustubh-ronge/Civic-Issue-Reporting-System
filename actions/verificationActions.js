'use server'

import { db } from "@/lib/prisma"
import { checkUser } from "@/lib/checkUser"
import { revalidatePath } from "next/cache"

export async function verifyReport(reportId) {
    try {
        const user = await checkUser()
        if (!user) return { success: false, error: "You must be logged in." }

        // Check if already verified by this user
        const existing = await db.verification.findUnique({
            where: {
                reportId_verifierId: {
                    reportId,
                    verifierId: user.id
                }
            }
        })

        if (existing) {
            return { success: false, error: "You have already verified this report" }
        }

        // Create verification
        await db.verification.create({
            data: {
                reportId,
                verifierId: user.id,
                isVerified: true
            }
        })

        // Get updated verification count
        const verificationCount = await db.verification.count({
            where: { reportId, isVerified: true }
        })
        
        // Mark as verified if 3+ verifications
        const report = await db.report.update({
            where: { id: reportId },
            data: {
                verificationCount,
                isVerified: verificationCount >= 3
            },
            include: {
                author: true
            }
        })

        // Award reputation points to verifier
        await db.user.update({
            where: { id: user.id },
            data: {
                reputationPoints: {
                    increment: 1
                }
            }
        })

        // Award reputation to report author if verified
        if (verificationCount >= 3) {
            await db.user.update({
                where: { id: report.authorId },
                data: {
                    verifiedReports: {
                        increment: 1
                    },
                    reputationPoints: {
                        increment: 5
                    }
                }
            })
        }

        revalidatePath(`/report/${reportId}`)
        return { success: true }
    } catch (error) {
        console.error("Verify Report Error:", error)
        return { success: false, error: "Failed to verify report" }
    }
}

