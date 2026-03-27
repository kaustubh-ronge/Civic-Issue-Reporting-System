import { NextResponse } from 'next/server';
import { db } from '@/lib/prisma';
import { checkUser } from '@/lib/checkUser';

// Fetch all notifications for the logged-in user
export async function GET(request) {
    try {
        const user = await checkUser();
        if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

        const notifications = await db.notification.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ success: true, notifications });
    } catch (error) {
        console.error("NOTIFICATIONS GET ERROR:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch notifications" }, { status: 500 });
    }
}

// Mark a single notification (or all) as read
export async function PUT(request) {
    try {
        const user = await checkUser();
        if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

        const body = await request.json();
        const { notificationId } = body;

        if (notificationId) {
            // Mark a specific notification as read
            await db.notification.update({
                where: { id: notificationId, userId: user.id }, // Ensure user owns it
                data: { isRead: true }
            });
        } else {
            // Mark ALL as read
            await db.notification.updateMany({
                where: { userId: user.id, isRead: false },
                data: { isRead: true }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("NOTIFICATIONS PUT ERROR:", error);
        return NextResponse.json({ success: false, error: "Failed to update" }, { status: 500 });
    }
}