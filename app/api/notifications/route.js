import { NextResponse } from 'next/server';
import { getRecentNotifications, markAsRead } from '@/actions/notificationActions';

export async function GET() {
    const result = await getRecentNotifications(10);
    return NextResponse.json(result);
}

export async function PATCH(request) {
    const { id } = await request.json();
    const result = await markAsRead(id);
    return NextResponse.json(result);
}