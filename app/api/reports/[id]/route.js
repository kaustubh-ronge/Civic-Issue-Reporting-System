
import { NextResponse } from 'next/server';
import { getReportByReportId } from '@/actions/reportActions';

export async function GET(request, { params }) {
    try {
        const { id } = await params; // Crucial for Next.js 15
        const result = await getReportByReportId(id);
        
        if (!result.success) {
            return NextResponse.json({ success: false, error: "Report not found" }, { status: 404 });
        }
        
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}