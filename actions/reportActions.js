'use server'

import { db } from "@/lib/prisma"
import { checkUser } from "@/lib/checkUser"
import { revalidatePath } from "next/cache"
import { sendNotification } from "@/lib/notifications"

export async function createReport(formData) {
    try {
        const user = await checkUser()
        if (!user) return { success: false, error: "You must be logged in." }

        // Check ban
        const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { isBanned: true } })
        if (dbUser?.isBanned) return { success: false, error: "Account banned." }

        // 1. Basic Fields & Validation
        const title = (formData.get("title") || "").toString().trim()
        const description = (formData.get("description") || "").toString().trim()
        const cityId = formData.get("cityId")
        const departmentId = formData.get("departmentId")
        const address = formData.get("address")

        // Validate required inputs early
        if (!title || title.length < 5) return { success: false, error: "Title is required (min 5 characters)." }
        if (!description || description.length < 10) return { success: false, error: "Description is required (min 10 characters)." }
        if (!cityId || !departmentId) return { success: false, error: "City and Department are required." }

        // 2. Category Logic
        const selectedCategory = formData.get("category")
        const customCategory = formData.get("customCategory")
        let finalCategory = selectedCategory === "Other" && customCategory ? customCategory.toString().trim() : selectedCategory

        // 3. Priority & Location
        const priority = formData.get("priority") === "AUTO" ? null : formData.get("priority")
        let lat = parseFloat(formData.get("lat"))
        let lng = parseFloat(formData.get("lng"))
        lat = Number.isFinite(lat) ? lat : null
        lng = Number.isFinite(lng) ? lng : null
        const detectedPriority = priority || "MEDIUM"

        const reportId = `RPT-${Math.floor(1000 + Math.random() * 9000)}`
        const shareToken = `share_${Math.random().toString(36).substring(2, 15)}`

        // 4. Area Logic
        let area = null
        if (address) {
            try {
                const { findOrCreateArea } = await import("@/lib/areaNormalizer").catch(() => ({}))
                if (findOrCreateArea) area = await findOrCreateArea(db, cityId, address)
            } catch (e) { }
        }

        // Tags (limit to 10 sanitized tags)
        const tags = (formData.getAll("tags") || []).map(t => t.toString().trim()).filter(Boolean).slice(0, 10)

        // 5. Create Report Record
        const report = await db.report.create({
            data: {
                reportId,
                title,
                description: address ? `${description}\n\n📍 Location: ${address}` : description,
                status: "PENDING",
                priority: detectedPriority,
                category: finalCategory,
                latitude: lat,
                longitude: lng,
                shareToken,
                author: { connect: { id: user.id } },
                city: { connect: { id: cityId } },
                department: { connect: { id: departmentId } },
                ...(area && { area: { connect: { id: area.id } } }),

                // Tags
                ...(tags.length > 0 && {
                    tags: {
                        connectOrCreate: tags.map(tag => ({
                            where: { name: tag },
                            create: { name: tag }
                        }))
                    }
                }),

                updates: {
                    create: { newStatus: "PENDING", note: "Report submitted", updatedBy: "system" }
                }
            }
        })

        // 6. 🟢 IMAGE TO DATABASE LOGIC (Base64) - limit to 5 images
        const imageFiles = (formData.getAll("images") || []).slice(0, 5)

        if (imageFiles && imageFiles.length > 0) {
            for (let i = 0; i < imageFiles.length; i++) {
                const file = imageFiles[i]

                if (file && file.size > 0) {
                    // Convert file to Buffer
                    const buffer = Buffer.from(await file.arrayBuffer());

                    // Convert Buffer to Base64 String
                    const base64Data = buffer.toString("base64");
                    const fileType = file.type || "image/jpeg"; // Default to jpeg if type missing

                    // Create the Data URI (e.g. "data:image/png;base64,iVBOR...")
                    // This string renders directly in <img src="..." />
                    const base64Url = `data:${fileType};base64,${base64Data}`;

                    // Save the HUGE string directly to the DB
                    await db.reportImage.create({
                        data: {
                            reportId: report.id,
                            url: base64Url, // Storing data here
                            order: i
                        }
                    })

                    // Backward compatibility for single image field
                    if (i === 0) {
                        await db.report.update({
                            where: { id: report.id },
                            data: { imageUrl: base64Url }
                        })
                    }
                }
            }
        }

        if (sendNotification) {
            await sendNotification(user.id, "Report Submitted", `ID: ${reportId}`, reportId, detectedPriority).catch(() => { })
        }

        revalidatePath('/admin')
        revalidatePath('/status')

        return { success: true, reportId }

    } catch (error) {
        console.error("Submission Error:", error)
        return { success: false, error: "Failed to submit report." }
    }
}

// ... (Rest of the file: getReportByReportId, getUserReports remains the same)
export async function getReportByReportId(reportId) {
    try {
        let report = await db.report.findUnique({
            where: { reportId },
            include: {
                author: { select: { firstName: true, email: true } },
                city: { include: { state: true } },
                department: true,
                area: true,
                tags: true,
                images: { orderBy: { order: 'asc' } },
                updates: { orderBy: { createdAt: 'desc' } }
            }
        })
        if (!report) return { success: false, error: "Not found" }

        // Auto-close if pending verification expired
        if (report.status === 'PENDING_VERIFICATION' && report.pendingVerificationExpiresAt && new Date(report.pendingVerificationExpiresAt) < new Date()) {
            const updated = await db.report.update({
                where: { id: report.id },
                data: { status: 'RESOLVED', pendingVerificationExpiresAt: null, updates: { create: { oldStatus: 'PENDING_VERIFICATION', newStatus: 'RESOLVED', note: 'Auto-closed after pending verification window', updatedBy: 'system' } } }
            })
            report = { ...report, status: 'RESOLVED' }
        }

        return { success: true, report }
    } catch (error) { return { success: false, error: "Fetch failed" } }
}

export async function getUserReports() {
    try {
        const user = await checkUser()
        if (!user) return { success: false, error: "Unauthorized" }
        const reports = await db.report.findMany({
            where: { authorId: user.id },
            orderBy: { createdAt: 'desc' },
            include: { city: true, department: true, images: { take: 1 } }
        })
        return { success: true, reports }
    } catch (error) { return { success: false, error: "Fetch failed" } }
}

// --- Resolution confirmation and reopen actions ---
export async function confirmResolution(reportId) {
    try {
        const user = await checkUser()
        if (!user) return { success: false, error: "You must be logged in." }

        const report = await db.report.findFirst({ where: { OR: [{ id: reportId }, { reportId: reportId }] } })
        if (!report) return { success: false, error: "Report not found" }
        if (report.authorId !== user.id) return { success: false, error: "Unauthorized" }
        if (report.status !== 'PENDING_VERIFICATION') return { success: false, error: "Report not awaiting verification" }

        await db.report.update({
            where: { id: report.id },
            data: {
                status: 'RESOLVED',
                pendingVerificationExpiresAt: null,
                updates: { create: { oldStatus: 'PENDING_VERIFICATION', newStatus: 'RESOLVED', note: 'Reporter confirmed fix', updatedBy: user.id } }
            }
        })

        // Notify admins
        try {
            const admins = await db.adminProfile.findMany({ where: { departmentId: report.departmentId }, include: { user: true } })
            for (const a of admins) {
                await sendNotification(a.userId, 'Report Confirmed', `Reporter confirmed resolution for ${report.reportId}` , report.reportId)
            }
        } catch (e) { }

        revalidatePath(`/report/${report.reportId}`)
        revalidatePath('/admin')
        return { success: true }
    } catch (error) {
        console.error('Confirm Resolution Error:', error)
        return { success: false, error: 'Failed to confirm' }
    }
}

export async function reopenReport(reportId, reason = '') {
    try {
        const user = await checkUser()
        if (!user) return { success: false, error: "You must be logged in." }

        const report = await db.report.findFirst({ where: { OR: [{ id: reportId }, { reportId: reportId }] } })
        if (!report) return { success: false, error: "Report not found" }
        if (report.authorId !== user.id) return { success: false, error: "Unauthorized" }
        if (report.status !== 'PENDING_VERIFICATION') return { success: false, error: "Report not awaiting verification" }

        await db.report.update({
            where: { id: report.id },
            data: {
                status: 'IN_PROGRESS',
                priority: 'HIGH',
                pendingVerificationExpiresAt: null,
                updates: { create: { oldStatus: 'PENDING_VERIFICATION', newStatus: 'IN_PROGRESS', note: reason || 'Reporter reopened the ticket', updatedBy: user.id } }
            }
        })

        // Notify admins
        try {
            const admins = await db.adminProfile.findMany({ where: { departmentId: report.departmentId }, include: { user: true } })
            for (const a of admins) {
                await sendNotification(a.userId, 'Report Reopened', `Reporter reopened ticket ${report.reportId}` , report.reportId)
            }
        } catch (e) { }

        revalidatePath(`/report/${report.reportId}`)
        revalidatePath('/admin')
        return { success: true }
    } catch (error) {
        console.error('Reopen Error:', error)
        return { success: false, error: 'Failed to reopen' }
    }
}

// Auto-close expired pending verifications (can be called by a cron job)
export async function autoCloseExpiredVerifications() {
    try {
        const now = new Date()
        const toClose = await db.report.findMany({ where: { status: 'PENDING_VERIFICATION', pendingVerificationExpiresAt: { lt: now } } })
        for (const r of toClose) {
            await db.report.update({ where: { id: r.id }, data: { status: 'RESOLVED', pendingVerificationExpiresAt: null, updates: { create: { oldStatus: 'PENDING_VERIFICATION', newStatus: 'RESOLVED', note: 'Auto-closed after pending verification window', updatedBy: 'system' } } } })
            try {
                await sendNotification(r.authorId, 'Report Auto-Closed', `Your report ${r.reportId} was auto-closed after verification window.`, r.reportId)
            } catch (e) { }
        }
        return { success: true, closed: toClose.length }
    } catch (error) {
        console.error('Auto close error:', error)
        return { success: false, error: 'Failed to auto-close' }
    }
}