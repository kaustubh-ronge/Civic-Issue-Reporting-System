import { NextResponse } from 'next/server';
import { autoCloseExpiredVerifications } from '@/actions/reportActions';

export async function POST(request) {
    try {
        const result = await autoCloseExpiredVerifications();
        return NextResponse.json(result);
    } catch (error) {
        console.error("AUTO_CLOSE_API_ERROR:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// Also allow GET for cron jobs
export async function GET(request) {
    try {
        const result = await autoCloseExpiredVerifications();
        return NextResponse.json(result);
    } catch (error) {
        console.error("AUTO_CLOSE_API_ERROR:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}