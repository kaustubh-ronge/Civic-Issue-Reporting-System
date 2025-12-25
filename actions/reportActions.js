'use server'

import { db } from "@/lib/prisma"
import { checkUser } from "@/lib/checkUser"
import { revalidatePath } from "next/cache"
// Keep these imports if the files exist, otherwise comment them out to prevent crashes
import { detectPriority } from "@/lib/priorityDetector" 
import { sendNotification } from "@/lib/notifications"

// --- 1. CREATE REPORT ---
export async function createReport(formData) {
    try {
        const user = await checkUser()
        if (!user) return { success: false, error: "You must be logged in." }

        // Check ban status
        const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { isBanned: true } })
        if (dbUser?.isBanned) {
            return { success: false, error: "Your account is banned." }
        }

        // Extract Basic Fields
        const title = formData.get("title")
        const description = formData.get("description")
        const cityId = formData.get("cityId")
        const departmentId = formData.get("departmentId")
        const address = formData.get("address")
        
        // Handle Category Logic (String)
        const selectedCategory = formData.get("category")
        const customCategory = formData.get("customCategory")
        let finalCategoryString = selectedCategory;
        if (selectedCategory === "Other" && customCategory) {
            finalCategoryString = customCategory;
        }

        // Priority & Location
        const rawPriority = formData.get("priority")
        const priority = (rawPriority && rawPriority !== "AUTO") ? rawPriority : null
        const lat = parseFloat(formData.get("lat")) || 0
        const lng = parseFloat(formData.get("lng")) || 0
        const detectedPriority = priority || (detectPriority ? detectPriority(title, description) : "MEDIUM")

        const reportId = `RPT-${Math.floor(1000 + Math.random() * 9000)}`
        const shareToken = `share_${Math.random().toString(36).substring(2, 15)}`

        // Area Logic (Dynamic import safety)
        let area = null
        if (address) {
            try {
                const { findOrCreateArea } = await import("@/lib/areaNormalizer").catch(() => ({}))
                if (findOrCreateArea) {
                    area = await findOrCreateArea(db, cityId, address)
                }
            } catch (e) { console.log("Area skip") }
        }

        // Tags & Images Logic
        const tags = formData.getAll("tags") || []
        const imageFiles = formData.getAll("images")
        // Thumbnail logic: check if valid file exists
        const hasImages = imageFiles.length > 0 && imageFiles[0].size > 0;
        const firstImageUrl = hasImages ? "placeholder-thumbnail.jpg" : null

        // Create Report
        const report = await db.report.create({
            data: {
                reportId,
                title,
                description: `${description}\n\n📍 Location: ${address}`,
                status: "PENDING",
                priority: detectedPriority,
                category: finalCategoryString, // Saving as simple String
                latitude: lat,
                longitude: lng,
                imageUrl: firstImageUrl,
                shareToken,
                
                author: { connect: { id: user.id } },
                city: { connect: { id: cityId } },
                department: { connect: { id: departmentId } },
                
                ...(area && { area: { connect: { id: area.id } } }),

                // Tags Logic
                ...(tags.length > 0 && {
                    tags: {
                        connectOrCreate: tags.map(tagName => ({
                            where: { name: tagName },
                            create: { name: tagName }
                        }))
                    }
                }),

                // Initial Update
                updates: {
                    create: {
                        newStatus: "PENDING",
                        note: "Report submitted via Web Portal",
                        updatedBy: "System"
                    }
                }
            }
        })
        
        // Save Image Records
        if (hasImages) {
            for (let i = 0; i < imageFiles.length; i++) {
                await db.reportImage.create({
                    data: {
                        reportId: report.id,
                        // In real app, this URL comes from AWS S3
                        url: `https://placehold.co/600x400?text=Evidence+${i+1}`, 
                        order: i
                    }
                })
            }
        }
        
        // Notifications
        if (sendNotification) {
            await sendNotification(
                user.id,
                "Report Submitted",
                `Report ID: ${reportId} submitted successfully.`,
                reportId,
                detectedPriority
            ).catch(e => console.log("Notification failed", e))
        }

        revalidatePath('/admin')
        revalidatePath('/status')
        return { success: true, reportId }

    } catch (error) {
        console.error("Submission Error:", error)
        return { success: false, error: "Failed to submit report." }
    }
}

// --- 2. GET SINGLE REPORT (Fixed: Includes Images) ---
export async function getReportByReportId(reportId) {
    try {
        if (!reportId || typeof reportId !== 'string') {
            return { success: false, error: "Invalid report ID" }
        }

        const report = await db.report.findUnique({
            where: { reportId: reportId },
            include: {
                author: {
                    select: { firstName: true, email: true }
                },
                city: {
                    include: { state: true }
                },
                department: true,
                area: true,
                tags: true, // Fetch tags
                images: {   // Fetch multiple images
                    orderBy: { order: 'asc' }
                },
                updates: {  // Fetch timeline
                    orderBy: { createdAt: 'desc' }
                }
            }
        })

        if (!report) {
            return { success: false, error: "Report not found" }
        }

        return { success: true, report }
    } catch (error) {
        console.error("Get Report Error:", error)
        return { success: false, error: "Failed to fetch report" }
    }
}

// --- 3. GET USER REPORTS ---
export async function getUserReports() {
    try {
        const user = await checkUser()
        if (!user) return { success: false, error: "Unauthorized" }

        const reports = await db.report.findMany({
            where: { authorId: user.id },
            orderBy: { createdAt: 'desc' },
            include: {
                city: true,
                department: true,
                images: { take: 1 } // Just get thumbnail
            }
        })

        return { success: true, reports }
    } catch (error) {
        console.error("Get User Reports Error:", error)
        return { success: false, error: "Failed to fetch reports" }
    }
}