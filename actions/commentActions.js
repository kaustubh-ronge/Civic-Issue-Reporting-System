'use server'

import { db } from "@/lib/prisma"
import { checkUser } from "@/lib/checkUser"
import { revalidatePath } from "next/cache"

export async function addComment(reportId, content, isPublic = true) {
    try {
        const user = await checkUser()
        if (!user) return { success: false, error: "You must be logged in." }

        const comment = await db.comment.create({
            data: {
                reportId,
                authorId: user.id,
                content,
                isPublic
            },
            include: {
                author: {
                    select: {
                        firstName: true,
                        email: true
                    }
                }
            }
        })

        revalidatePath(`/report/${reportId}`)
        return { success: true, comment }
    } catch (error) {
        console.error("Add Comment Error:", error)
        return { success: false, error: "Failed to add comment" }
    }
}

export async function getReportComments(reportId) {
    try {
        const comments = await db.comment.findMany({
            where: {
                reportId,
                isPublic: true,
                isModerated: false // Only show approved comments
            },
            orderBy: { createdAt: 'desc' },
            include: {
                author: {
                    select: {
                        firstName: true
                    }
                }
            }
        })

        return { success: true, comments }
    } catch (error) {
        console.error("Get Comments Error:", error)
        return { success: false, error: "Failed to fetch comments" }
    }
}

export async function moderateComment(commentId, approve = true) {
    try {
        const user = await checkUser()
        if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
            return { success: false, error: "Unauthorized" }
        }

        await db.comment.update({
            where: { id: commentId },
            data: {
                isModerated: approve
            }
        })

        revalidatePath('/admin')
        return { success: true }
    } catch (error) {
        console.error("Moderate Comment Error:", error)
        return { success: false, error: "Failed to moderate comment" }
    }
}

