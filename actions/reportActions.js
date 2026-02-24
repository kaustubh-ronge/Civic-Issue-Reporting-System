'use server'

import { db } from "@/lib/prisma"
import { checkUser } from "@/lib/checkUser"
import { revalidatePath } from "next/cache"
import { sendNotification } from "@/lib/notifications"
import fs from "fs"
import path from "path"
import { randomUUID } from "crypto"
import Mux from '@mux/mux-node'

// helper: upload a single File object to Mux and return playback/asset ids
async function uploadFileToMux(file) {
    const { MUX_TOKEN_ID, MUX_TOKEN_SECRET } = process.env
    if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
        throw new Error("Missing MUX credentials")
    }
    const mux = new Mux({
        accessToken: MUX_TOKEN_ID,
        secret: MUX_TOKEN_SECRET
    })

    // create a direct upload; asset will be auto-created with public playback
    const upload = await mux.uploads.create({
        new_asset_settings: { playback_policy: 'public' }
    })
    const uploadUrl = upload.url
    const uploadId = upload.id

    // upload the file bytes to the returned URL
    await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'video/mp4' },
        body: Buffer.from(await file.arrayBuffer())
    })

    // wait for associated asset to appear; the SDK can list assets by upload_id
    let asset = null
    for (let i = 0; i < 20; i++) {
        const list = await mux.assets.list({ upload_id: uploadId, limit: 1 })
        if (list.items && list.items.length > 0) {
            asset = list.items[0]
            if (asset.status === 'ready' || asset.status === 'errored') break
        }
        await new Promise(r => setTimeout(r, 1000))
    }
    if (!asset) throw new Error('Mux asset not found for upload ' + uploadId)
    const playbackId = asset.playback_ids?.[0]?.id
    return { playbackId, assetId: asset.id }
}

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

        // 7. 🎥 VIDEO : attempt to send to Mux if credentials are available.
        //   fall back to disk storage for development or missing keys.
        const videoFiles = (formData.getAll("videos") || []).slice(0, 2)
        const skippedVideos = []

        if (videoFiles && videoFiles.length > 0) {
            for (let i = 0; i < videoFiles.length; i++) {
                const file = videoFiles[i]

                if (file && file.size > 0) {
                    // guard size
                    const MAX_BYTES = 25 * 1024 * 1024
                    if (file.size > MAX_BYTES) {
                        skippedVideos.push(file.name || file.type || `#${i}`)
                        continue
                    }

                    let playbackId = null
                    let assetId = null
                    let storedUrl = null

                    // try upload to mux
                    try {
                        const result = await uploadFileToMux(file)
                        playbackId = result.playbackId
                        assetId = result.assetId
                        if (!playbackId) throw new Error("Mux returned no playback id")
                    } catch (muxErr) {
                        console.warn('Mux upload failed, falling back to disk:', muxErr)
                        // fallback: write to disk same as before
                        const outDir = path.join(process.cwd(), "public", "report-videos")
                        await fs.promises.mkdir(outDir, { recursive: true })
                        const buffer = Buffer.from(await file.arrayBuffer())
                        let ext = path.extname(file.name) || ''
                        if (!ext && file.type) {
                            const mimePart = file.type.split('/')[1]
                            if (mimePart) ext = `.${mimePart}`
                        }
                        if (!ext) ext = ".mp4"
                        const filename = `${randomUUID()}${ext}`
                        const savePath = path.join(outDir, filename)
                        await fs.promises.writeFile(savePath, buffer)
                        storedUrl = `/report-videos/${filename}`
                    }

                    // make sure we don't create duplicates if the same file
                    // somehow gets processed twice (this was happening in some
                    // edge cases).  look up by playbackId or url, whichever we
                    // ended up with.
                    const whereConditions = [{ reportId: report.id }]
                    if (playbackId) whereConditions.push({ playbackId })
                    if (storedUrl) whereConditions.push({ url: storedUrl })

                    const existing = await db.reportVideo.findFirst({
                        where: { OR: whereConditions }
                    })
                    if (existing) {
                        continue // skip duplicate entry
                    }

                    await db.reportVideo.create({
                        data: {
                            reportId: report.id,
                            order: i,
                            ...(storedUrl && { url: storedUrl }),
                            ...(playbackId && { playbackId }),
                            ...(assetId && { assetId })
                        }
                    })
                }
            }
        }

        // if any videos were skipped because they were too big, include a warning
        let response = { success: true, reportId }
        if (skippedVideos.length) {
            response.warning = `Some videos were too large and were not uploaded: ${skippedVideos.join(', ')}`
        }

        if (sendNotification) {
            await sendNotification(user.id, "Report Submitted", `ID: ${reportId}`, reportId, detectedPriority).catch(() => { })
        }

        revalidatePath('/admin')
        revalidatePath('/status')

        return response

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
                videos: { orderBy: { order: 'asc' }, select: { id: true, order: true, url: true, playbackId: true, assetId: true } },
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

// --- Server action: retrieve full video URL for client playback ---
export async function getVideoUrl(videoId) {
    if (!videoId) throw new Error("Missing videoId")
    const vid = await db.reportVideo.findUnique({ where: { id: videoId } })
    if (!vid) throw new Error("Video not found")

    // if record has a Mux playback ID, construct the streaming url
    if (vid.playbackId) {
        // return MP4 variant to satisfy all browsers; `.m3u8` would require HLS support
        return `https://stream.mux.com/${vid.playbackId}.mp4`
    }

    // otherwise fall back to stored url or data uri
    return vid.url || ""
}

// --- Resolution confirmation and reopen actions ---
export async function confirmResolution(formData) {
    try {
        const user = await checkUser()
        if (!user) return { success: false, error: "You must be logged in." }

        const rawId = formData instanceof FormData ? (formData.get("reportId") || "").toString() : formData

        const report = await db.report.findFirst({ where: { OR: [{ id: rawId }, { reportId: rawId }] } })
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

export async function reopenReport(formData) {
    try {
        const user = await checkUser()
        if (!user) return { success: false, error: "You must be logged in." }

        const rawId = formData instanceof FormData ? (formData.get("reportId") || "").toString() : formData
        const reason = formData instanceof FormData ? (formData.get("reason") || "").toString() : ''

        const report = await db.report.findFirst({ where: { OR: [{ id: rawId }, { reportId: rawId }] } })
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