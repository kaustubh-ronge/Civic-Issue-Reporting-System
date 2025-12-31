'use server'

import { db } from "@/lib/prisma"
import { checkUser } from "@/lib/checkUser"
import { revalidatePath } from "next/cache"
// Keep this import if you have the file, otherwise comment it out to avoid crashes
import { sendNotification } from "@/lib/notifications" 

export async function getAdminReports() {
    try {
        const user = await checkUser()
        if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
            return { success: false, error: "Unauthorized" }
        }

        const adminProfile = await db.adminProfile.findUnique({
            where: { userId: user.id },
            include: { department: true }
        })

        if (!adminProfile) return { success: false, error: "Profile not found" }

        const reports = await db.report.findMany({
            where: {
                departmentId: adminProfile.departmentId
            },
            orderBy: [
                { priority: 'desc' }, // Critical first
                { createdAt: 'desc' }
            ],
            include: {
                author: {
                    select: { firstName: true, email: true } 
                },
                // ❌ REMOVED: category: true (It's a string now, so it fetches automatically)
                tags: true,
                images: {
                    orderBy: { order: 'asc' }
                }
            }
        })

        return { success: true, reports }

    } catch (error) {
        console.error("Fetch Reports Error:", error)
        return { success: false, error: "Failed to load reports" }
    }
}

export async function updateReportStatus(reportId, newStatus, adminNote, priority = null, estimatedCost = null) {
    try {
        const user = await checkUser()
        if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
            return { success: false, error: "Unauthorized" }
        }

        // Get the report to check author
        const report = await db.report.findUnique({
            where: { id: reportId },
            include: { author: true }
        })

        if (!report) {
            return { success: false, error: "Report not found" }
        }

        // Get old status for timeline
        const oldStatus = report.status
        
        // Prepare update data
        // If admin marks as RESOLVED, move to PENDING_VERIFICATION and set an expiry window
        let targetStatus = newStatus
        const updateData = {
            adminNote: adminNote,
            updates: {
                create: {
                    oldStatus: oldStatus,
                    newStatus: newStatus,
                    note: adminNote || `Status changed from ${oldStatus} to ${newStatus}`,
                    updatedBy: user.id
                }
            }
        }

        if (newStatus === 'RESOLVED') {
            targetStatus = 'PENDING_VERIFICATION'
            updateData.status = targetStatus
            updateData.pendingVerificationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        } else {
            updateData.status = targetStatus
        }
        
        // Add priority if provided
        if (priority) {
            updateData.priority = priority
        }
        
        // Add estimated cost if provided
        if (estimatedCost !== null) {
            updateData.estimatedCost = parseFloat(estimatedCost)
        }
        
        // Update report status and create timeline entry
        await db.report.update({
            where: { id: reportId },
            data: updateData
        })
        
        // Send notification to report author
        // (Wrapped in try/catch in case notification system fails, ensuring DB update still works)
        try {
            const statusMessages = {
                'PENDING': 'is pending review',
                'IN_PROGRESS': 'is now in progress',
                'PENDING_VERIFICATION': 'is marked resolved and awaiting your confirmation',
                'RESOLVED': 'has been resolved',
                'REJECTED': 'has been rejected as fake'
            }
            
            if (typeof sendNotification === 'function') {
                await sendNotification(
                    report.authorId,
                    `Report Status Updated: ${targetStatus}`,
                    `Your report "${report.title}" ${statusMessages[targetStatus] || 'status has been updated'}. ${adminNote ? `Note: ${adminNote}` : ''}`,
                    report.reportId,
                    report.priority
                )
            }
        } catch (notifError) {
            console.error("Notification failed:", notifError)
        }

        // If marked as REJECTED (fake), increment strike count
        if (newStatus === 'REJECTED') {
            const updatedUser = await db.user.update({
                where: { id: report.authorId },
                data: {
                    strikeCount: {
                        increment: 1
                    }
                }
            })

            // If strike count reaches 3, ban the user
            if (updatedUser.strikeCount >= 3 && !updatedUser.isBanned) {
                await db.user.update({
                    where: { id: report.authorId },
                    data: {
                        isBanned: true
                    }
                })
            }
        }

        revalidatePath('/admin')
        revalidatePath('/dashboard')
        revalidatePath('/status')
        return { success: true }

    } catch (error) {
        console.error("Update Status Error:", error)
        return { success: false, error: "Update failed" }
    }
}