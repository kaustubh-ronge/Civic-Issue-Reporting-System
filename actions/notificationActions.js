'use server'

import { db } from "@/lib/prisma"
import { checkUser } from "@/lib/checkUser"
import { revalidatePath } from "next/cache"

// 1. Get recent notifications (for the dropdown)
export async function getRecentNotifications(limit = 5) {
    try {
        const user = await checkUser()
        if (!user) return { success: false, data: [] }

        const notifications = await db.notification.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            take: limit
        })

        // Get unread count
        const unreadCount = await db.notification.count({
            where: { userId: user.id, isRead: false }
        })

        return { success: true, notifications, unreadCount }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

// 2. Get ALL notifications (for the full page)
export async function getAllNotifications() {
    try {
        const user = await checkUser()
        if (!user) return { success: false, data: [] }

        const notifications = await db.notification.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' }
        })

        return { success: true, notifications }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

// 3. Mark specific notification as read
export async function markAsRead(notificationId) {
    try {
        const user = await checkUser()
        if (!user) return { success: false }

        await db.notification.update({
            where: { id: notificationId, userId: user.id }, // Ensure ownership
            data: { isRead: true }
        })

        revalidatePath('/notifications')
        return { success: true }
    } catch (error) {
        return { success: false }
    }
}

// 4. Mark ALL as read
export async function markAllAsRead() {
    try {
        const user = await checkUser()
        if (!user) return { success: false }

        await db.notification.updateMany({
            where: { userId: user.id, isRead: false },
            data: { isRead: true }
        })

        revalidatePath('/notifications')
        return { success: true }
    } catch (error) {
        return { success: false }
    }
}