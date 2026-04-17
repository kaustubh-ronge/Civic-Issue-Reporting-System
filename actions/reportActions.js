

'use server'

import { db } from "@/lib/prisma"
import { checkUser } from "@/lib/checkUser"
import { revalidatePath } from "next/cache"
import { sendNotification } from "@/lib/notifications"
import { analyzeWeatherAndRisk } from "@/lib/environmentalIntelligence"
import fs from "fs"
import path from "path"
import { randomUUID } from "crypto"
import Mux from '@mux/mux-node'

async function uploadFileToMux(file) {
    const { MUX_TOKEN_ID, MUX_TOKEN_SECRET } = process.env
    if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
        throw new Error("Missing MUX credentials")
    }
    const mux = new Mux({
        accessToken: MUX_TOKEN_ID,
        secret: MUX_TOKEN_SECRET
    })

    const upload = await mux.uploads.create({
        new_asset_settings: { playback_policy: 'public' }
    })
    const uploadUrl = upload.url
    const uploadId = upload.id

    await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'video/mp4' },
        body: Buffer.from(await file.arrayBuffer())
    })

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

        const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { isBanned: true } })
        if (dbUser?.isBanned) return { success: false, error: "Account banned." }

        const title = (formData.get("title") || "").toString().trim()
        const description = (formData.get("description") || "").toString().trim()
        const cityId = formData.get("cityId")
        const departmentId = formData.get("departmentId")
        const address = formData.get("address")
        
        const aiImageBase64 = formData.get("aiImage")

        if (!title || title.length < 5) return { success: false, error: "Title is required (min 5 characters)." }
        if (!description || description.length < 10) return { success: false, error: "Description is required (min 10 characters)." }
        if (!cityId || !departmentId) return { success: false, error: "City and Department are required." }

        const selectedCategory = formData.get("category")
        const customCategory = formData.get("customCategory")
        let finalCategory = selectedCategory === "Other" && customCategory ? customCategory.toString().trim() : selectedCategory

        const priority = formData.get("priority") === "AUTO" ? null : formData.get("priority")
        let lat = parseFloat(formData.get("lat"))
        let lng = parseFloat(formData.get("lng"))
        lat = Number.isFinite(lat) ? lat : null
        lng = Number.isFinite(lng) ? lng : null
        const detectedPriority = priority || "MEDIUM"

        const reportId = `RPT-${Math.floor(1000 + Math.random() * 9000)}`
        const shareToken = `share_${Math.random().toString(36).substring(2, 15)}`

        let area = null
        if (address) {
            try {
                const { findOrCreateArea } = await import("@/lib/areaNormalizer").catch(() => ({}))
                if (findOrCreateArea) area = await findOrCreateArea(db, cityId, address)
            } catch (e) { }
        }

        const tags = (formData.getAll("tags") || []).map(t => t.toString().trim()).filter(Boolean).slice(0, 10)

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
                
                aiImageUrl: aiImageBase64 ? aiImageBase64.toString() : null,
                
                author: { connect: { id: user.id } },
                city: { connect: { id: cityId } },
                department: { connect: { id: departmentId } },
                ...(area && { area: { connect: { id: area.id } } }),

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

        const imageFiles = (formData.getAll("images") || []).slice(0, 5)

        if (imageFiles && imageFiles.length > 0) {
            for (let i = 0; i < imageFiles.length; i++) {
                const file = imageFiles[i]

                if (file && file.size > 0) {
                    const buffer = Buffer.from(await file.arrayBuffer());
                    const base64Data = buffer.toString("base64");
                    const fileType = file.type || "image/jpeg"; 
                    const base64Url = `data:${fileType};base64,${base64Data}`;

                    await db.reportImage.create({
                        data: {
                            reportId: report.id,
                            url: base64Url, 
                            order: i
                        }
                    })

                    if (i === 0) {
                        await db.report.update({
                            where: { id: report.id },
                            data: { imageUrl: base64Url }
                        })
                    }
                }
            }
        }

        const videoFiles = (formData.getAll("videos") || []).slice(0, 2)
        const skippedVideos = []

        if (videoFiles && videoFiles.length > 0) {
            for (let i = 0; i < videoFiles.length; i++) {
                const file = videoFiles[i]

                if (file && file.size > 0) {
                    const MAX_BYTES = 25 * 1024 * 1024
                    if (file.size > MAX_BYTES) {
                        skippedVideos.push(file.name || file.type || `#${i}`)
                        continue
                    }

                    let playbackId = null
                    let assetId = null
                    let storedUrl = null

                    try {
                        const result = await uploadFileToMux(file)
                        playbackId = result.playbackId
                        assetId = result.assetId
                        if (!playbackId) throw new Error("Mux returned no playback id")
                    } catch (muxErr) {
                        console.warn('Mux upload failed, falling back to disk:', muxErr)
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

                    const whereConditions = [{ reportId: report.id }]
                    if (playbackId) whereConditions.push({ playbackId })
                    if (storedUrl) whereConditions.push({ url: storedUrl })

                    const existing = await db.reportVideo.findFirst({
                        where: { OR: whereConditions }
                    })
                    if (existing) continue

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

        let response = { success: true, reportId }
        if (skippedVideos.length) {
            response.warning = `Some videos were too large and were not uploaded: ${skippedVideos.join(', ')}`
        }

        if (sendNotification) {
            await sendNotification(user.id, "Report Submitted", `ID: ${reportId}`, reportId, detectedPriority).catch(() => { })
        }

        // TRIGGER AI WEATHER ASSESSMENT
        analyzeWeatherAndRisk(report.id).catch(console.error);

        revalidatePath('/admin')
        revalidatePath('/status')

        return response

    } catch (error) {
        console.error("Submission Error:", error)
        return { success: false, error: "Failed to submit report." }
    }
}

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

export async function getVideoUrl(videoId) {
    if (!videoId) throw new Error("Missing videoId")
    const vid = await db.reportVideo.findUnique({ where: { id: videoId } })
    if (!vid) throw new Error("Video not found")

    if (vid.playbackId) {
        return `https://stream.mux.com/${vid.playbackId}.mp4`
    }

    return vid.url || ""
}

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

export async function createMobileReport(formData) {
    try {
        const user = await checkUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { isBanned: true } });
        if (dbUser?.isBanned) return { success: false, error: "Account banned." };

        const title = (formData.get("title") || "").toString().trim();
        const description = (formData.get("description") || "").toString().trim();
        const cityId = formData.get("cityId");
        const departmentId = formData.get("departmentId");
        const lat = parseFloat(formData.get("lat"));
        const lng = parseFloat(formData.get("lng"));
        const address = formData.get("address");
        const category = formData.get("category");
        const customCategory = formData.get("customCategory");
        const finalCategory = category === "Other" && customCategory ? customCategory.toString().trim() : category;
        const priority = formData.get("priority") || "MEDIUM";
        
        const aiImageBase64 = formData.get("aiImage");

        const reportId = `RPT-${Math.floor(1000 + Math.random() * 9000)}`;
        const shareToken = `share_${Math.random().toString(36).substring(2, 15)}`;
        const tags = formData.getAll("tags").filter(Boolean);

        let area = null;
        if (address) {
            try {
                const { findOrCreateArea } = await import("@/lib/areaNormalizer").catch(() => ({}));
                if (findOrCreateArea) {
                    area = await findOrCreateArea(db, cityId, address);
                }
            } catch (e) { 
                console.error("Area resolution failed:", e); 
            }
        }

        const muxVideoIds = formData.getAll("muxVideoIds");
        const mobileVideoData = [];

        const mux = new Mux({
            accessToken: process.env.MUX_TOKEN_ID,
            secret: process.env.MUX_TOKEN_SECRET
        });

        for (let i = 0; i < muxVideoIds.length; i++) {
            const uploadId = muxVideoIds[i].toString();
            
            let finalPlaybackId = uploadId; 
            let finalAssetId = uploadId;
            let finalUrl = null;

            try {
                for (let j = 0; j < 15; j++) {
                    const listResponse = await mux.video.assets.list({ upload_id: uploadId, limit: 1 });
                    const assetsArray = listResponse.data || listResponse.items || listResponse;

                    if (Array.isArray(assetsArray) && assetsArray.length > 0) {
                        const asset = assetsArray[0];
                        finalAssetId = asset.id;
                        
                        if (asset.playback_ids && asset.playback_ids.length > 0) {
                            finalPlaybackId = asset.playback_ids[0].id;
                            finalUrl = `https://stream.mux.com/${finalPlaybackId}.mp4`;
                            break; 
                        }
                    }
                    await new Promise(r => setTimeout(r, 1000));
                }
            } catch (err) {
                console.error("Mux polling error:", err);
            }

            mobileVideoData.push({
                playbackId: finalPlaybackId,
                assetId: finalAssetId,
                url: finalUrl,
                order: i
            });
        }

        const report = await db.report.create({
            data: {
                reportId,
                title,
                description: address ? `${description}\n\n📍 Location: ${address}` : description,
                status: "PENDING",
                priority: priority === "AUTO" ? "MEDIUM" : priority,
                category: finalCategory,
                latitude: Number.isFinite(lat) ? lat : null,
                longitude: Number.isFinite(lng) ? lng : null,
                shareToken,
                
                aiImageUrl: aiImageBase64 ? aiImageBase64.toString() : null,

                author: { connect: { id: user.id } },
                city: { connect: { id: cityId } },
                department: { connect: { id: departmentId } },
                
                ...(area && { area: { connect: { id: area.id } } }),

                videos: {
                    create: mobileVideoData 
                },
                ...(tags.length > 0 && {
                    tags: {
                        connectOrCreate: tags.map(tag => ({
                            where: { name: tag },
                            create: { name: tag }
                        }))
                    }
                }),
                updates: {
                    create: { newStatus: "PENDING", note: "Report submitted via Mobile App", updatedBy: "system" }
                }
            }
        });

        const images = formData.getAll("images");
        for (let i = 0; i < images.length; i++) {
            const file = images[i];
            if (file && file.size > 0) {
                const buffer = Buffer.from(await file.arrayBuffer());
                const base64Url = `data:${file.type || "image/jpeg"};base64,${buffer.toString("base64")}`;
                await db.reportImage.create({
                    data: { reportId: report.id, url: base64Url, order: i }
                });
                
                if (i === 0) {
                    await db.report.update({ where: { id: report.id }, data: { imageUrl: base64Url } });
                }
            }
        }

        if (sendNotification) {
            await sendNotification(user.id, "Report Submitted", `ID: ${reportId}`, reportId, priority).catch(() => {});
        }

        // TRIGGER AI WEATHER ASSESSMENT
        analyzeWeatherAndRisk(report.id).catch(console.error);

        revalidatePath('/status');
        revalidatePath('/admin');
        return { success: true, reportId: report.reportId };

    } catch (error) {
        console.error("MOBILE SUBMISSION ERROR:", error);
        return { success: false, error: "Database error occurred." };
    }
}