'use server'

import { db } from "@/lib/prisma"
import { checkUser } from "@/lib/checkUser"
import { revalidatePath } from "next/cache"
// Keep imports if files exist
import { detectPriority } from "@/lib/priorityDetector" 
import { sendNotification } from "@/lib/notifications"

export async function createReport(formData) {
    try {
        const user = await checkUser()
        if (!user) return { success: false, error: "You must be logged in." }

        // Check ban
        const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { isBanned: true } })
        if (dbUser?.isBanned) return { success: false, error: "Account banned." }

        // 1. Basic Fields
        const title = formData.get("title")
        const description = formData.get("description")
        const cityId = formData.get("cityId")
        const departmentId = formData.get("departmentId")
        const address = formData.get("address")
        
        // 2. Category Logic
        const selectedCategory = formData.get("category")
        const customCategory = formData.get("customCategory")
        let finalCategory = selectedCategory === "Other" && customCategory ? customCategory : selectedCategory;

        // 3. Priority & Location
        const priority = formData.get("priority") === "AUTO" ? null : formData.get("priority")
        const lat = parseFloat(formData.get("lat")) || 0
        const lng = parseFloat(formData.get("lng")) || 0
        const detectedPriority = priority || "MEDIUM"

        const reportId = `RPT-${Math.floor(1000 + Math.random() * 9000)}`
        const shareToken = `share_${Math.random().toString(36).substring(2, 15)}`

        // 4. Area Logic
        let area = null
        if (address) {
            try {
                const { findOrCreateArea } = await import("@/lib/areaNormalizer").catch(() => ({}))
                if (findOrCreateArea) area = await findOrCreateArea(db, cityId, address)
            } catch (e) {}
        }

        // 5. Create Report Record
        const report = await db.report.create({
            data: {
                reportId,
                title,
                description: `${description}\n\n📍 Location: ${address}`,
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
                ...(formData.getAll("tags").length > 0 && {
                    tags: {
                        connectOrCreate: formData.getAll("tags").map(tag => ({
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

        // 6. 🟢 IMAGE TO DATABASE LOGIC (Base64)
        const imageFiles = formData.getAll("images")
        
        if (imageFiles && imageFiles.length > 0) {
            for (let i = 0; i < imageFiles.length; i++) {
                const file = imageFiles[i]
                
                if (file.size > 0) {
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
            await sendNotification(user.id, "Report Submitted", `ID: ${reportId}`, reportId, detectedPriority).catch(() => {})
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
        const report = await db.report.findUnique({
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